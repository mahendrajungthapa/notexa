<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'username', 'email', 'password', 'avatar', 'institution', 'role',
        'storage_used', 'storage_limit', 'is_active', 'streak_count', 'last_streak_date',
        'email_verification_code_hash', 'email_verification_code_expires_at',
        'password_reset_code_hash', 'password_reset_code_expires_at',
    ];

    protected $hidden = ['password', 'remember_token', 'email_verification_code_hash', 'password_reset_code_hash'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'email_verification_code_expires_at' => 'datetime',
        'password_reset_code_expires_at' => 'datetime',
        'last_streak_date' => 'date',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    // Owned content
    public function notes() { return $this->hasMany(Note::class); }
    public function files() { return $this->hasMany(File::class); }
    public function activityLogs() { return $this->hasMany(ActivityLog::class); }

    public function sentFriendRequests()
    {
        return $this->hasMany(Friendship::class, 'sender_id');
    }

    public function receivedFriendRequests()
    {
        return $this->hasMany(Friendship::class, 'receiver_id');
    }

    public function sharedNotes()
    {
        return $this->belongsToMany(Note::class, 'note_shares', 'shared_with', 'note_id')
            ->withPivot('permission', 'shared_by')->withTimestamps();
    }

    public function sharedFiles()
    {
        return $this->belongsToMany(File::class, 'file_shares', 'shared_with', 'file_id')
            ->withPivot('shared_by')->withTimestamps();
    }

    // Accepted friend list used by note/file sharing.
    public function friends()
    {
        $sentIds = Friendship::where('sender_id', $this->id)->where('status', 'accepted')->pluck('receiver_id');
        $receivedIds = Friendship::where('receiver_id', $this->id)->where('status', 'accepted')->pluck('sender_id');
        $friendIds = $sentIds->merge($receivedIds)->unique();
        return User::whereIn('id', $friendIds)->get();
    }

    public function isAdmin(): bool { return $this->role === 'admin'; }

    public function hasStorageSpace(int $bytes): bool
    {
        return ($this->storage_used + $bytes) <= $this->storage_limit;
    }

    public function isFriendWith(User $user): bool
    {
        return Friendship::where(function ($q) use ($user) {
            $q->where(function ($q2) use ($user) {
                $q2->where('sender_id', $this->id)->where('receiver_id', $user->id);
            })->orWhere(function ($q2) use ($user) {
                $q2->where('sender_id', $user->id)->where('receiver_id', $this->id);
            });
        })->where('status', 'accepted')->exists();
    }
}
