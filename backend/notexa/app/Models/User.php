<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'username', 'email', 'password', 'avatar', 'role',
        'is_premium', 'premium_expires_at', 'storage_used', 'storage_limit', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'premium_expires_at' => 'datetime',
        'is_premium' => 'boolean',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    public function notes() { return $this->hasMany(Note::class); }
    public function files() { return $this->hasMany(File::class); }
    public function payments() { return $this->hasMany(Payment::class); }
    public function subscriptions() { return $this->hasMany(Subscription::class); }
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

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('is_active', true)->where('expires_at', '>', now());
    }

    // FIXED: friends() returns proper collection using query
    public function friends()
    {
        $sentIds = Friendship::where('sender_id', $this->id)->where('status', 'accepted')->pluck('receiver_id');
        $receivedIds = Friendship::where('receiver_id', $this->id)->where('status', 'accepted')->pluck('sender_id');
        $friendIds = $sentIds->merge($receivedIds)->unique();
        return User::whereIn('id', $friendIds)->get();
    }

    public function isAdmin(): bool { return $this->role === 'admin'; }

    public function isPremium(): bool
    {
        return $this->is_premium && $this->premium_expires_at && $this->premium_expires_at->isFuture();
    }

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
