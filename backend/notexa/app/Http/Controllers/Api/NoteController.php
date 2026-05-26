<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\NoteShare;
use App\Models\NoteVersion;
use App\Models\SiteSetting;
use App\Services\AiService;
use App\Services\OcrService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->user()->notes()->where('is_trashed', false);

        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")->orWhere('plain_text', 'like', "%{$s}%");
            });
        }
        if ($c = $request->get('color')) $query->where('color', $c);

        $notes = $query->orderByDesc('is_pinned')->orderByDesc('updated_at')
            ->paginate($request->get('per_page', 20));

        return response()->json(['status' => 'success', 'data' => $notes]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'is_pinned' => 'sometimes|boolean',
        ]);

        $note = $request->user()->notes()->create([
            'title' => $request->title,
            'content' => $request->content,
            'plain_text' => strip_tags($request->content ?? ''),
            'color' => $request->color ?? '#ffffff',
            'is_pinned' => $request->boolean('is_pinned'),
        ]);

        NoteVersion::create([
            'note_id' => $note->id, 'user_id' => $request->user()->id,
            'content' => $request->content ?? '', 'change_summary' => 'Initial version',
            'version_number' => 1,
        ]);

        return response()->json(['status' => 'success', 'data' => $note], 201);
    }

    public function show(Request $request, Note $note)
    {
        $collabTokenGrantsEdit = $this->collabTokenGrantsEdit($request, $note);

        if (!$collabTokenGrantsEdit && !$note->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $note->load(['shares.recipient:id,name,username,avatar', 'files', 'user:id,name,username,avatar']);

        $permission = 'owner';
        if ($note->user_id !== $request->user()->id) {
            $share = $note->shares()->where('shared_with', $request->user()->id)->first();
            $permission = $collabTokenGrantsEdit ? 'edit' : ($share ? $share->permission : 'none');
        }

        return response()->json(['status' => 'success', 'data' => $note, 'permission' => $permission]);
    }

    public function collabPresence(Request $request, Note $note)
    {
        $collabTokenGrantsEdit = $this->collabTokenGrantsEdit($request, $note);

        if (!$collabTokenGrantsEdit && !$note->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->presenceList($note),
        ]);
    }

    public function collabHeartbeat(Request $request, Note $note)
    {
        $collabTokenGrantsEdit = $this->collabTokenGrantsEdit($request, $note);

        if (!$collabTokenGrantsEdit && !$note->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'client_id' => 'required|string|max:80',
            'is_typing' => 'sometimes|boolean',
            'color' => 'nullable|string|max:20',
        ]);

        $user = $request->user();
        $clientId = preg_replace('/[^a-zA-Z0-9_-]/', '', $validated['client_id']) ?: (string) $user->id;
        $key = $this->presenceKey($note->id, $user->id, $clientId);
        $indexKey = $this->presenceIndexKey($note->id);
        $now = now();

        Cache::put($key, [
            'client_id' => $clientId,
            'user_id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'avatar' => $user->avatar,
            'color' => $validated['color'] ?? '#6366f1',
            'is_typing' => $request->boolean('is_typing'),
            'updated_at' => $now->toISOString(),
            'expires_at_unix' => $now->copy()->addSeconds(18)->timestamp,
        ], now()->addSeconds(22));

        $keys = Cache::get($indexKey, []);
        $keys[] = $key;
        Cache::put($indexKey, array_values(array_unique($keys)), now()->addHour());

        return response()->json([
            'status' => 'success',
            'data' => $this->presenceList($note),
        ]);
    }

    public function update(Request $request, Note $note)
    {
        if (!$note->canEdit($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'No edit permission'], 403);
        }

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|nullable|string',
            'color' => 'sometimes|string|max:7',
            'is_pinned' => 'sometimes|boolean',
        ]);

        $data = $request->only(['title', 'content', 'color', 'is_pinned']);
        $contentChanged = false;
        $previousContent = (string) ($note->content ?? '');
        if (array_key_exists('content', $data)) {
            $incomingContent = (string) ($data['content'] ?? '');
            $contentChanged = $incomingContent !== $previousContent;
            $data['content'] = $incomingContent;
            $data['plain_text'] = strip_tags($incomingContent);
        }
        $note->update($data);

        if ($contentChanged) {
            $lastV = $note->versions()->max('version_number') ?? 0;
            NoteVersion::create([
                'note_id' => $note->id, 'user_id' => $request->user()->id,
                'content' => $data['content'],
                'change_summary' => $this->summarizeContentChange($previousContent, $data['content']),
                'version_number' => $lastV + 1,
            ]);
        }

        return response()->json(['status' => 'success', 'data' => $note->fresh()]);
    }

    public function destroy(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        $note->update(['is_trashed' => true, 'trashed_at' => now()]);
        return response()->json(['status' => 'success', 'message' => 'Moved to trash.']);
    }

    public function restore(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $note->update(['is_trashed' => false, 'trashed_at' => null]);
        return response()->json(['status' => 'success']);
    }

    public function permanentDelete(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $note->delete();
        return response()->json(['status' => 'success']);
    }

    public function togglePin(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $note->update(['is_pinned' => !$note->is_pinned]);
        return response()->json(['status' => 'success', 'data' => $note->fresh()]);
    }

    public function trashed(Request $request)
    {
        return response()->json(['status' => 'success', 'data' =>
            $request->user()->notes()->where('is_trashed', true)->orderByDesc('trashed_at')->paginate(20)
        ]);
    }

    public function versions(Request $request, Note $note)
    {
        if (!$note->canView($request->user())) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $versions = $note->versions()
            ->with(['user:id,name,username', 'restoredFrom:id,version_number'])
            ->paginate(20);

        $versions->through(fn (NoteVersion $version) => $this->versionPayload($note, $version));

        return response()->json(['status' => 'success', 'data' => $versions]);
    }

    public function restoreVersion(Request $request, Note $note, NoteVersion $version)
    {
        if (!$note->canEdit($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'No edit permission'], 403);
        }

        if ($version->note_id !== $note->id) {
            return response()->json(['status' => 'error', 'message' => 'Version not found for this note.'], 404);
        }

        $targetContent = (string) ($version->content ?? '');
        $currentContent = (string) ($note->content ?? '');
        $note->update([
            'content' => $targetContent,
            'plain_text' => strip_tags($targetContent),
        ]);

        $newVersion = null;
        if ($targetContent !== $currentContent) {
            $lastV = $note->versions()->max('version_number') ?? 0;
            $newVersion = NoteVersion::create([
                'note_id' => $note->id,
                'user_id' => $request->user()->id,
                'content' => $targetContent,
                'change_summary' => "Restored from draft #{$version->version_number}",
                'restored_from_version_id' => $version->id,
                'version_number' => $lastV + 1,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Restored draft #{$version->version_number}.",
            'data' => [
                'note' => $note->fresh(),
                'version' => $newVersion ? $this->versionPayload($note, $newVersion->load(['user:id,name,username', 'restoredFrom:id,version_number'])) : null,
            ],
        ]);
    }

    public function ocrImage(Request $request, Note $note, OcrService $ocr)
    {
        if (!$note->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'image' => 'required|string|max:12000000',
        ]);

        try {
            $text = $ocr->readImage($validated['image']);
        } catch (RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 503);
        }

        return response()->json([
            'status' => 'success',
            'data' => ['text' => $text],
        ]);
    }

    // ── SHARE CODE: Generate / Get ──
    public function getShareCode(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        if (!$note->share_code) {
            $note->update(['share_code' => Note::generateUniqueShareCode()]);
        }
        return response()->json(['status' => 'success', 'share_code' => $note->share_code]);
    }

    public function regenerateShareCode(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $note->update(['share_code' => Note::generateUniqueShareCode()]);
        return response()->json(['status' => 'success', 'share_code' => $note->share_code]);
    }

    // ── REDEEM SHARE CODE ──
    public function redeemShareCode(Request $request)
    {
        $request->validate(['code' => 'required|string|size:8']);

        $note = Note::where('share_code', strtoupper($request->code))->first();
        if (!$note) return response()->json(['status' => 'error', 'message' => 'Invalid code.'], 404);
        if ($note->user_id === $request->user()->id) return response()->json(['status' => 'error', 'message' => 'This is your own note.'], 400);

        $existing = NoteShare::where('note_id', $note->id)->where('shared_with', $request->user()->id)->first();
        if ($existing) return response()->json(['status' => 'error', 'message' => 'Already shared with you.'], 400);

        NoteShare::create([
            'note_id' => $note->id,
            'shared_by' => $note->user_id,
            'shared_with' => $request->user()->id,
            'permission' => 'view',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Note '{$note->title}' added to your shared notes.",
            'data' => $note->load('user:id,name,username'),
        ]);
    }

    // ── AI SUMMARY ──
    public function aiSummary(Request $request, Note $note, AiService $ai)
    {
        if (!$note->canView($request->user())) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);

        if (!SiteSetting::get('ai_enabled', true)) {
            return response()->json(['status' => 'error', 'message' => 'AI summaries are disabled in admin settings.'], 403);
        }

        $text = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($note->plain_text ?: $note->content ?: ''))));
        if (strlen($text) < 20) return response()->json(['status' => 'error', 'message' => 'Note is too short to summarize.'], 400);

        $summary = $ai->summarize($text);

        if (!$summary) return response()->json(['status' => 'error', 'message' => 'Could not generate a summary for this note.'], 500);

        $note->update(['ai_summary' => $summary]);

        return response()->json(['status' => 'success', 'summary' => $summary]);
    }

    public function aiQuery(Request $request, Note $note, AiService $ai)
    {
        if (!$note->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        if (!SiteSetting::get('ai_enabled', true)) {
            return response()->json(['status' => 'error', 'message' => 'AI tools are disabled in admin settings.'], 403);
        }

        $validated = $request->validate([
            'systemPrompt' => 'required|string|max:4000',
            'userPrompt' => 'required|string|max:20000',
        ]);

        try {
            $result = $ai->chat($validated['systemPrompt'], $validated['userPrompt']);
        } catch (RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 503);
        }

        return response()->json([
            'status' => 'success',
            'data' => ['result' => $result],
        ]);
    }

    private function collabTokenGrantsEdit(Request $request, Note $note): bool
    {
        $collabToken = $request->input('collab_token')
            ?: $request->input('token')
            ?: $request->query('collab_token')
            ?: $request->query('token');

        if (!$collabToken || !$note->share_code || !hash_equals((string) $note->share_code, strtoupper(trim((string) $collabToken)))) {
            return false;
        }

        if ($note->user_id !== $request->user()->id) {
            NoteShare::updateOrCreate(
                ['note_id' => $note->id, 'shared_with' => $request->user()->id],
                ['shared_by' => $note->user_id, 'permission' => 'edit']
            );
        }

        return true;
    }

    private function presenceList(Note $note): array
    {
        $indexKey = $this->presenceIndexKey($note->id);
        $keys = Cache::get($indexKey, []);
        $active = [];
        $freshKeys = [];
        $now = time();

        foreach ($keys as $key) {
            $entry = Cache::get($key);
            if (!$entry || (int) ($entry['expires_at_unix'] ?? 0) < $now) {
                continue;
            }

            $freshKeys[] = $key;
            unset($entry['expires_at_unix']);
            $active[] = $entry;
        }

        Cache::put($indexKey, $freshKeys, now()->addHour());

        usort($active, function ($a, $b) {
            if (($a['is_typing'] ?? false) !== ($b['is_typing'] ?? false)) {
                return ($a['is_typing'] ?? false) ? -1 : 1;
            }

            return strcmp((string) ($b['updated_at'] ?? ''), (string) ($a['updated_at'] ?? ''));
        });

        return $active;
    }

    private function presenceKey(int $noteId, int $userId, string $clientId): string
    {
        return "note_presence:{$noteId}:{$userId}:{$clientId}";
    }

    private function presenceIndexKey(int $noteId): string
    {
        return "note_presence_index:{$noteId}";
    }

    private function versionPayload(Note $note, NoteVersion $version): array
    {
        $payload = $version->toArray();
        $plainText = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags((string) $version->content))));

        $payload['plain_text'] = $plainText;
        $payload['word_count'] = $plainText === '' ? 0 : str_word_count($plainText);
        $payload['change_summary'] = $version->change_summary
            ?: $this->summarizeContentChange($this->previousVersionContent($note, $version), (string) $version->content);

        return $payload;
    }

    private function previousVersionContent(Note $note, NoteVersion $version): string
    {
        $previous = $note->versions()
            ->where('version_number', '<', $version->version_number)
            ->orderByDesc('version_number')
            ->first();

        return (string) ($previous?->content ?? '');
    }

    private function summarizeContentChange(string $beforeHtml, string $afterHtml): string
    {
        $before = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($beforeHtml))));
        $after = trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($afterHtml))));

        if ($before === '' && $after !== '') {
            return 'Added ' . str_word_count($after) . ' words';
        }

        if ($before !== '' && $after === '') {
            return 'Removed all note text';
        }

        $beforeWords = str_word_count($before);
        $afterWords = str_word_count($after);
        $delta = $afterWords - $beforeWords;

        if ($delta > 0) {
            return "Added {$delta} words";
        }

        if ($delta < 0) {
            return 'Removed ' . abs($delta) . ' words';
        }

        return $before === $after ? 'No text change' : 'Edited note text';
    }
}
