<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Note;

Broadcast::channel('note.{noteId}', function ($user, $noteId) {
    $note = Note::find($noteId);
    if (!$note) return false;
    if ($note->canView($user)) {
        return ['id' => $user->id, 'name' => $user->name, 'username' => $user->username];
    }
    return false;
});
