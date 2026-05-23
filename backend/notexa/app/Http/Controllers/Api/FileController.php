<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\Note;
use App\Services\R2StorageService;
use Illuminate\Http\Request;

class FileController extends Controller
{
    public function __construct(private R2StorageService $r2) {}

    public function index(Request $request)
    {
        return response()->json(['status' => 'success', 'data' =>
            $request->user()->files()->orderByDesc('created_at')->paginate(20)
        ]);
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200', // 50MB
            'note_id' => 'nullable|exists:notes,id',
        ]);

        $user = $request->user();
        $uploaded = $request->file('file');
        $note = null;

        if ($request->filled('note_id')) {
            $note = Note::findOrFail($request->note_id);
            if (!$note->canEdit($user)) {
                return response()->json(['status' => 'error', 'message' => 'No edit permission for this note.'], 403);
            }
        }

        if (!$user->hasStorageSpace($uploaded->getSize())) {
            return response()->json(['status' => 'error', 'message' => 'Storage limit reached. Upgrade to Premium.'], 400);
        }

        $fileData = $this->r2->upload($uploaded, "users/{$user->id}");

        $file = File::create(array_merge($fileData, [
            'user_id' => $user->id,
            'note_id' => $note?->id,
        ]));

        $user->increment('storage_used', $fileData['size']);

        return response()->json(['status' => 'success', 'data' => $file], 201);
    }

    public function download(Request $request, File $file)
    {
        if ($file->user_id !== $request->user()->id) {
            if ($file->note_id) {
                $note = $file->note;
                if (!$note || !$note->canView($request->user())) {
                    return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
                }
            } else {
                return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
            }
        }
        $url = $this->r2->getTemporaryUrl($file->r2_key, 30, $file->id);
        return response()->json(['status' => 'success', 'download_url' => $url]);
    }

    public function serve(Request $request, File $file)
    {
        return $this->r2->downloadResponse($file->r2_key, $file->original_name);
    }

    public function destroy(Request $request, File $file)
    {
        if ($file->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $this->r2->delete($file->r2_key);
        $request->user()->decrement('storage_used', $file->size);
        $file->delete();
        return response()->json(['status' => 'success']);
    }
}
