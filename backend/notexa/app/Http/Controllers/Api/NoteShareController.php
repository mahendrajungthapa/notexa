<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\NoteShare;
use App\Models\User;
use Illuminate\Http\Request;

class NoteShareController extends Controller
{
    public function sharedWithMe(Request $request)
    {
        $notes = $request->user()->sharedNotes()
            ->with('user:id,name,username,avatar')
            ->orderByDesc('note_shares.created_at')->paginate(20);
        return response()->json(['status' => 'success', 'data' => $notes]);
    }

    public function share(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Only owner can share.'], 403);

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'permission' => 'required|in:view,edit',
        ]);

        $target = User::findOrFail($request->user_id);
        if ($target->id === $request->user()->id) return response()->json(['status'=>'error','message'=>'Cannot share with yourself.'], 400);
        if (!$request->user()->isFriendWith($target)) {
            return response()->json(['status'=>'error','message'=>'Add this user as a friend before sharing notes.'], 403);
        }

        $share = NoteShare::updateOrCreate(
            ['note_id' => $note->id, 'shared_with' => $target->id],
            ['shared_by' => $request->user()->id, 'permission' => $request->permission]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Shared with @{$target->username}.",
            'data' => $share->load('recipient:id,name,username,avatar'),
        ]);
    }

    public function updatePermission(Request $request, Note $note, $userId)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $request->validate(['permission' => 'required|in:view,edit']);
        $share = NoteShare::where('note_id', $note->id)->where('shared_with', $userId)->firstOrFail();
        $share->update(['permission' => $request->permission]);
        return response()->json(['status' => 'success', 'data' => $share->fresh()]);
    }

    public function unshare(Request $request, Note $note, $userId)
    {
        if ($note->user_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        NoteShare::where('note_id', $note->id)->where('shared_with', $userId)->delete();
        return response()->json(['status' => 'success']);
    }

    public function collaborators(Request $request, Note $note)
    {
        if (!$note->canView($request->user())) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        return response()->json(['status' => 'success', 'data' => $note->shares()->with('recipient:id,name,username,avatar')->get()]);
    }
}
