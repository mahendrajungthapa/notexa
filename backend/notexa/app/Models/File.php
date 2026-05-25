<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    protected $fillable = [
        'user_id', 'note_id', 'folder_id', 'original_name', 'stored_name',
        'path', 'mime_type', 'size', 'r2_key', 'r2_url',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function note() { return $this->belongsTo(Note::class); }
    public function folder() { return $this->belongsTo(FileFolder::class, 'folder_id'); }
    public function shares() { return $this->hasMany(FileShare::class); }

    public function sharedWith()
    {
        return $this->belongsToMany(User::class, 'file_shares', 'file_id', 'shared_with')
            ->withPivot('shared_by')->withTimestamps();
    }

    public function canView(User $user): bool
    {
        if ($this->user_id === $user->id) return true;
        if ($this->shares()->where('shared_with', $user->id)->exists()) return true;

        return $this->note_id
            ? (bool) $this->note?->canView($user)
            : false;
    }
}
