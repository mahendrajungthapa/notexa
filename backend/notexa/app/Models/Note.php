<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Note extends Model
{
    protected $fillable = [
        'user_id', 'title', 'content', 'plain_text', 'color',
        'is_pinned', 'is_archived', 'is_trashed', 'share_code', 'ai_summary', 'trashed_at',
    ];

    protected $casts = [
        'is_pinned' => 'boolean', 'is_archived' => 'boolean',
        'is_trashed' => 'boolean', 'trashed_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($note) {
            if (!$note->share_code) {
                $note->share_code = self::generateUniqueShareCode();
            }
        });
    }

    public static function generateUniqueShareCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (self::where('share_code', $code)->exists());

        return $code;
    }

    public function user() { return $this->belongsTo(User::class); }
    public function shares() { return $this->hasMany(NoteShare::class); }
    public function files() { return $this->hasMany(File::class); }
    public function versions() { return $this->hasMany(NoteVersion::class)->orderByDesc('version_number'); }

    public function sharedWith()
    {
        return $this->belongsToMany(User::class, 'note_shares', 'note_id', 'shared_with')
            ->withPivot('permission', 'shared_by')->withTimestamps();
    }

    public function canView(User $user): bool
    {
        if ($this->user_id === $user->id) return true;
        return $this->shares()->where('shared_with', $user->id)->exists();
    }

    public function canEdit(User $user): bool
    {
        if ($this->user_id === $user->id) return true;
        return $this->shares()->where('shared_with', $user->id)->where('permission', 'edit')->exists();
    }
}
