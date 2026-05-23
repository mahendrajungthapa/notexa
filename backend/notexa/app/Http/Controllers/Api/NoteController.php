<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\NoteShare;
use App\Models\NoteVersion;
use App\Services\DeepSeekService;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->user()->notes()->where('is_trashed', false)->where('is_archived', false);

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
            'is_archived' => 'sometimes|boolean',
        ]);

        $note = $request->user()->notes()->create([
            'title' => $request->title,
            'content' => $request->content,
            'plain_text' => strip_tags($request->content ?? ''),
            'color' => $request->color ?? '#ffffff',
            'is_pinned' => $request->boolean('is_pinned'),
            'is_archived' => $request->boolean('is_archived'),
        ]);

        NoteVersion::create([
            'note_id' => $note->id, 'user_id' => $request->user()->id,
            'content' => $request->content ?? '', 'version_number' => 1,
        ]);

        return response()->json(['status' => 'success', 'data' => $note], 201);
    }

    public function show(Request $request, Note $note)
    {
        if (!$note->canView($request->user())) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $note->load(['shares.recipient:id,name,username,avatar', 'files', 'user:id,name,username,avatar']);

        $permission = 'owner';
        if ($note->user_id !== $request->user()->id) {
            $share = $note->shares()->where('shared_with', $request->user()->id)->first();
            $permission = $share ? $share->permission : 'none';
        }

        return response()->json(['status' => 'success', 'data' => $note, 'permission' => $permission]);
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
            'is_archived' => 'sometimes|boolean',
        ]);

        $data = $request->only(['title', 'content', 'color', 'is_pinned', 'is_archived']);
        if (isset($data['content'])) {
            $data['plain_text'] = strip_tags($data['content']);
        }
        $note->update($data);

        if (isset($data['content'])) {
            $lastV = $note->versions()->max('version_number') ?? 0;
            NoteVersion::create([
                'note_id' => $note->id, 'user_id' => $request->user()->id,
                'content' => $data['content'], 'version_number' => $lastV + 1,
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

    public function toggleArchive(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $note->update(['is_archived' => !$note->is_archived]);
        return response()->json(['status' => 'success', 'data' => $note->fresh()]);
    }

    public function archived(Request $request)
    {
        return response()->json(['status' => 'success', 'data' =>
            $request->user()->notes()->where('is_archived', true)->where('is_trashed', false)->orderByDesc('updated_at')->paginate(20)
        ]);
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
        return response()->json(['status' => 'success', 'data' => $note->versions()->with('user:id,name')->paginate(20)]);
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
    public function aiSummary(Request $request, Note $note)
    {
        if (!$note->canView($request->user())) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);

        $text = $note->plain_text ?? strip_tags($note->content ?? '');
        if (strlen($text) < 10) return response()->json(['status' => 'error', 'message' => 'Note is too short to summarize.'], 400);

        $service = new DeepSeekService();
        $summary = $service->summarize($text);

        if (!$summary) return response()->json(['status' => 'error', 'message' => 'AI service unavailable. Check DeepSeek API key in admin settings.'], 500);

        $note->update(['ai_summary' => $summary]);

        return response()->json(['status' => 'success', 'summary' => $summary]);
    }
}
