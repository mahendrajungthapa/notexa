<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\FileFolder;
use App\Models\FileShare;
use App\Models\Note;
use App\Models\User;
use App\Services\R2StorageService;
use Illuminate\Http\Request;
use Throwable;

class FileController extends Controller
{
    public function __construct(private R2StorageService $r2) {}

    private const MAX_UPLOAD_BYTES = 52428800;

    // Owned files for the My Files page.
    public function index(Request $request)
    {
        $query = $request->user()->files()
            ->with('shares.recipient:id,name,username,avatar')
            ->orderByDesc('created_at');

        if ($request->has('folder_id')) {
            $folderId = $this->folderIdFromRequest($request, 'folder_id');
            if ($folderId && !$this->folderOwnedBy($folderId, $request->user()->id)) {
                return response()->json(['status' => 'error', 'message' => 'Folder not found.'], 404);
            }
            $folderId ? $query->where('folder_id', $folderId) : $query->whereNull('folder_id');
        }

        $files = $query->paginate(20);

        $this->repairMissingSizes($files->getCollection());

        return response()->json(['status' => 'success', 'data' => $files]);
    }

    public function folders(Request $request)
    {
        $parentId = $this->folderIdFromRequest($request, 'parent_id');
        if ($parentId && !$this->folderOwnedBy($parentId, $request->user()->id)) {
            return response()->json(['status' => 'error', 'message' => 'Folder not found.'], 404);
        }

        $query = $request->user()->fileFolders()
            ->withCount(['files', 'children'])
            ->orderBy('name');

        $parentId ? $query->where('parent_id', $parentId) : $query->whereNull('parent_id');

        return response()->json(['status' => 'success', 'data' => $query->get()]);
    }

    public function createFolder(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|min:1|max:120',
            'parent_id' => 'nullable',
        ]);

        $parentId = $this->folderIdFromRequest($request, 'parent_id');
        if ($parentId && !$this->folderOwnedBy($parentId, $request->user()->id)) {
            return response()->json(['status' => 'error', 'message' => 'Parent folder not found.'], 404);
        }

        $name = trim($validated['name']);
        $duplicate = $request->user()->fileFolders()
            ->where(function ($query) use ($parentId) {
                $parentId ? $query->where('parent_id', $parentId) : $query->whereNull('parent_id');
            })
            ->whereRaw('lower(name) = ?', [strtolower($name)])
            ->exists();

        if ($duplicate) {
            return response()->json(['status' => 'error', 'message' => 'A folder with this name already exists here.'], 422);
        }

        $folder = FileFolder::create([
            'user_id' => $request->user()->id,
            'parent_id' => $parentId,
            'name' => $name,
        ])->loadCount(['files', 'children']);

        return response()->json(['status' => 'success', 'data' => $folder], 201);
    }

    // Files that friends shared directly with the current user.
    public function sharedWithMe(Request $request)
    {
        $files = $request->user()->sharedFiles()
            ->with('user:id,name,username,avatar')
            ->orderByDesc('file_shares.created_at')
            ->paginate(20);

        $this->repairMissingSizes($files->getCollection());

        return response()->json(['status' => 'success', 'data' => $files]);
    }

    // Upload file metadata and binary content, using R2 when configured.
    public function upload(Request $request)
    {
        $request->validate([
            'note_id' => 'nullable|exists:notes,id',
            'folder_id' => 'nullable',
        ]);

        $user = $request->user()->ensureDefaultStorageLimit();
        $uploaded = $request->file('file');
        $note = null;
        $folderId = $this->folderIdFromRequest($request, 'folder_id');

        if ($folderId && !$this->folderOwnedBy($folderId, $user->id)) {
            return response()->json(['status' => 'error', 'message' => 'Folder not found.'], 404);
        }

        if ($request->filled('note_id')) {
            $note = Note::findOrFail($request->note_id);
            if (!$note->canEdit($user)) {
                return response()->json(['status' => 'error', 'message' => 'No edit permission for this note.'], 403);
            }
        }

        $rawUpload = null;
        $uploadSize = $uploaded?->isValid() ? (int) $uploaded->getSize() : 0;

        if (!$uploaded?->isValid()) {
            $rawUpload = $this->decodeRawUpload($request);
            $uploadSize = $rawUpload['size'] ?? 0;
        }

        if ($uploadSize <= 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Choose a valid file to upload.',
                'errors' => ['file' => ['Choose a valid file to upload.']],
            ], 422);
        }

        if ($uploadSize > self::MAX_UPLOAD_BYTES) {
            return response()->json([
                'status' => 'error',
                'message' => 'File is too large. Maximum upload size is 50MB.',
                'errors' => ['file' => ['File is too large. Maximum upload size is 50MB.']],
            ], 422);
        }

        if (!$user->hasStorageSpace($uploadSize)) {
            return response()->json(['status' => 'error', 'message' => 'Storage limit reached. Delete unused files or ask an admin to increase your storage limit.'], 400);
        }

        try {
            $fileData = $rawUpload
                ? $this->r2->uploadRaw($rawUpload['contents'], $rawUpload['original_name'], $rawUpload['mime_type'], "users/{$user->id}")
                : $this->r2->upload($uploaded, "users/{$user->id}");

            $file = File::create(array_merge($fileData, [
                'user_id' => $user->id,
                'note_id' => $note?->id,
                'folder_id' => $folderId,
            ]));

            $user->increment('storage_used', $fileData['size']);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'status' => 'error',
                'message' => 'File upload failed. Please check storage permissions and try again.',
            ], 500);
        }

        $payload = $file->toArray();
        $payload['download_url'] = $this->r2->getTemporaryUrl($file->r2_key, 30, $file->id);
        if ($preview = $this->previewProfile($file)) {
            $payload['preview_url'] = $this->r2->getTemporaryPreviewUrl($file->r2_key, 60 * 24 * 365, $file->id);
            $payload['preview_type'] = $preview['type'];
        }

        return response()->json(['status' => 'success', 'data' => $payload], 201);
    }

    // Return a short-lived URL for preview/download after checking access.
    public function download(Request $request, File $file)
    {
        if (!$file->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $url = $this->r2->getTemporaryUrl($file->r2_key, 30, $file->id);
        return response()->json(['status' => 'success', 'download_url' => $url]);
    }

    // Return a browser-friendly signed URL for images and PDFs.
    public function preview(Request $request, File $file)
    {
        if (!$file->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $preview = $this->previewProfile($file);
        if (!$preview) {
            return response()->json([
                'status' => 'error',
                'message' => 'Preview is available only for PDF, text/code, and safe image files.',
            ], 415);
        }

        $url = $this->r2->getTemporaryPreviewUrl($file->r2_key, 30, $file->id);

        return response()->json([
            'status' => 'success',
            'preview_url' => $url,
            'preview_type' => $preview['type'],
        ]);
    }

    // Signed local-file response used when R2 is not configured.
    public function serve(Request $request, File $file)
    {
        return $this->r2->downloadResponse($file->r2_key, $file->original_name);
    }

    // Signed local-file response with inline disposition for previews.
    public function previewContent(Request $request, File $file)
    {
        $preview = $this->previewProfile($file);
        abort_unless($preview, 415, 'Preview is available only for PDF, text/code, and safe image files.');

        return $this->r2->inlineResponse($file->r2_key, $file->original_name, $preview['content_type']);
    }

    // Share an owned file with an accepted friend.
    public function share(Request $request, File $file)
    {
        if ($file->user_id !== $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Only the owner can share this file.'], 403);
        }

        $request->validate(['user_id' => 'required|exists:users,id']);

        $target = User::findOrFail($request->user_id);
        if ($target->id === $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Cannot share with yourself.'], 400);
        }
        if (!$request->user()->isFriendWith($target)) {
            return response()->json(['status' => 'error', 'message' => 'Add this user as a friend before sharing files.'], 403);
        }

        $share = FileShare::updateOrCreate(
            ['file_id' => $file->id, 'shared_with' => $target->id],
            ['shared_by' => $request->user()->id]
        );

        return response()->json([
            'status' => 'success',
            'message' => "File shared with @{$target->username}.",
            'data' => $share->load('recipient:id,name,username,avatar'),
        ]);
    }

    // Current recipients for one owned file.
    public function shares(Request $request, File $file)
    {
        if ($file->user_id !== $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'status' => 'success',
            'data' => $file->shares()->with('recipient:id,name,username,avatar')->get(),
        ]);
    }

    // Remove a friend's direct access to an owned file.
    public function unshare(Request $request, File $file, int $userId)
    {
        if ($file->user_id !== $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        FileShare::where('file_id', $file->id)->where('shared_with', $userId)->delete();

        return response()->json(['status' => 'success']);
    }

    // Delete owned file metadata and the backing storage object.
    public function destroy(Request $request, File $file)
    {
        if ($file->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $this->r2->delete($file->r2_key);
        $request->user()->decrement('storage_used', $file->size);
        $file->delete();
        return response()->json(['status' => 'success']);
    }

    private function previewProfile(File $file): ?array
    {
        $name = strtolower((string) $file->original_name);
        $mime = strtolower((string) $file->mime_type);
        $extension = pathinfo($name, PATHINFO_EXTENSION);

        if ($mime === 'application/pdf' || $extension === 'pdf') {
            return ['type' => 'pdf', 'content_type' => 'application/pdf'];
        }

        $safeImageMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];
        $safeImageExtensions = [
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'bmp' => 'image/bmp',
        ];
        if (in_array($mime, $safeImageMimes, true) || array_key_exists($extension, $safeImageExtensions)) {
            return ['type' => 'image', 'content_type' => in_array($mime, $safeImageMimes, true) ? $mime : $safeImageExtensions[$extension]];
        }

        $textExtensions = [
            'txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'json', 'xml', 'yaml', 'yml',
            'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx',
            'php', 'py', 'rb', 'java', 'kt', 'kts', 'swift', 'dart', 'go', 'rs',
            'c', 'h', 'cpp', 'hpp', 'cs', 'sql', 'sh', 'bash', 'zsh', 'ps1',
            'bat', 'cmd', 'env', 'ini', 'conf', 'config', 'toml', 'lock',
        ];

        if (str_starts_with($mime, 'text/') || in_array($extension, $textExtensions, true)) {
            return ['type' => 'text', 'content_type' => 'text/plain; charset=UTF-8'];
        }

        return null;
    }

    private function decodeRawUpload(Request $request): ?array
    {
        $base64 = (string) $request->input('file_base64', '');
        if ($base64 === '') {
            return null;
        }

        if (str_contains($base64, ',')) {
            [, $base64] = explode(',', $base64, 2);
        }

        $contents = base64_decode($base64, true);
        if ($contents === false) {
            return null;
        }

        $originalName = (string) $request->input('original_name', 'upload.bin');
        $mimeType = (string) $request->input('mime_type', 'application/octet-stream');

        return [
            'contents' => $contents,
            'original_name' => $originalName,
            'mime_type' => $mimeType !== '' ? $mimeType : 'application/octet-stream',
            'size' => strlen($contents),
        ];
    }

    private function repairMissingSizes($files): void
    {
        foreach ($files as $file) {
            if ((int) $file->size > 0) {
                continue;
            }

            $storedSize = $this->r2->storedSize($file->r2_key);
            if (!$storedSize || $storedSize <= 0) {
                continue;
            }

            $file->forceFill(['size' => $storedSize])->saveQuietly();
        }
    }

    private function folderIdFromRequest(Request $request, string $key): ?int
    {
        $value = $request->input($key);
        if ($value === null || $value === '' || $value === 'root' || $value === 'null') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }

    private function folderOwnedBy(int $folderId, int $userId): bool
    {
        return FileFolder::where('id', $folderId)->where('user_id', $userId)->exists();
    }
}
