<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class FriendController extends Controller
{
    // Accepted friends used by sharing screens.
    public function index(Request $request)
    {
        $friends = $request->user()->friends();
        $onlineIds = collect($this->onlineUserIds($friends->pluck('id')->all()))->flip();

        return response()->json([
            'status' => 'success',
            'data' => $friends->map(fn($f) => [
                'id' => $f->id, 'name' => $f->name, 'username' => $f->username,
                'email' => $f->email, 'avatar' => $f->avatar,
                'is_online' => $onlineIds->has($f->id),
            ]),
        ]);
    }

    // Incoming and outgoing pending requests for the Friends page.
    public function pendingRequests(Request $request)
    {
        $received = $request->user()->receivedFriendRequests()
            ->where('status', 'pending')->with('sender:id,name,username,avatar')->get();
        $sent = $request->user()->sentFriendRequests()
            ->where('status', 'pending')->with('receiver:id,name,username,avatar')->get();

        return response()->json(['status' => 'success', 'data' => ['received' => $received, 'sent' => $sent]]);
    }

    // Create or re-open a friend request by username.
    public function sendRequest(Request $request)
    {
        $request->validate(['username' => 'required|string']);

        $sender = $request->user();
        $receiver = User::where('username', strtolower($request->username))->first();

        if (!$receiver) return response()->json(['status' => 'error', 'message' => 'User not found.'], 404);
        if ($sender->id === $receiver->id) return response()->json(['status' => 'error', 'message' => 'Cannot add yourself.'], 400);

        // Check ALL existing friendships between these two users
        $existing = Friendship::where(function ($q) use ($sender, $receiver) {
            $q->where(function ($q2) use ($sender, $receiver) {
                $q2->where('sender_id', $sender->id)->where('receiver_id', $receiver->id);
            })->orWhere(function ($q2) use ($sender, $receiver) {
                $q2->where('sender_id', $receiver->id)->where('receiver_id', $sender->id);
            });
        })->first();

        if ($existing) {
            if ($existing->status === 'accepted') return response()->json(['status' => 'error', 'message' => 'Already friends.'], 400);
            if ($existing->status === 'pending') return response()->json(['status' => 'error', 'message' => 'Request already pending.'], 400);
            if ($existing->status === 'blocked') return response()->json(['status' => 'error', 'message' => 'Unable to send request.'], 400);
            // If rejected, allow re-sending
            if ($existing->status === 'rejected') {
                $existing->update(['status' => 'pending', 'sender_id' => $sender->id, 'receiver_id' => $receiver->id]);
                return response()->json(['status' => 'success', 'message' => 'Friend request sent.', 'data' => $existing->load('receiver:id,name,username,avatar')]);
            }
        }

        $friendship = Friendship::create(['sender_id' => $sender->id, 'receiver_id' => $receiver->id, 'status' => 'pending']);

        return response()->json([
            'status' => 'success', 'message' => "Friend request sent to @{$receiver->username}.",
            'data' => $friendship->load('receiver:id,name,username,avatar'),
        ]);
    }

    // Accept a request that was sent to the current user.
    public function acceptRequest(Request $request, Friendship $friendship)
    {
        if ($friendship->receiver_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        if ($friendship->status !== 'pending') return response()->json(['status'=>'error','message'=>'Not pending.'], 400);
        $friendship->update(['status' => 'accepted']);
        return response()->json(['status' => 'success', 'message' => 'Friend request accepted.']);
    }

    // Reject a request that was sent to the current user.
    public function rejectRequest(Request $request, Friendship $friendship)
    {
        if ($friendship->receiver_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        $friendship->update(['status' => 'rejected']);
        return response()->json(['status' => 'success', 'message' => 'Rejected.']);
    }

    // Cancel a pending request sent by the current user.
    public function cancelRequest(Request $request, Friendship $friendship)
    {
        if ($friendship->sender_id !== $request->user()->id) return response()->json(['status'=>'error','message'=>'Unauthorized'], 403);
        if ($friendship->status !== 'pending') return response()->json(['status'=>'error','message'=>'Not pending.'], 400);
        $friendship->delete();
        return response()->json(['status' => 'success', 'message' => 'Request cancelled.']);
    }

    // Remove an accepted friendship in either direction.
    public function removeFriend(Request $request, $userId)
    {
        $user = $request->user();
        $f = Friendship::where(function ($q) use ($user, $userId) {
            $q->where(function ($q2) use ($user, $userId) {
                $q2->where('sender_id', $user->id)->where('receiver_id', $userId);
            })->orWhere(function ($q2) use ($user, $userId) {
                $q2->where('sender_id', $userId)->where('receiver_id', $user->id);
            });
        })->where('status', 'accepted')->first();

        if (!$f) return response()->json(['status' => 'error', 'message' => 'Not found.'], 404);
        $f->delete();
        return response()->json(['status' => 'success', 'message' => 'Friend removed.']);
    }

    // Search active users and include the current relationship state.
    public function searchUsers(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);
        $current = $request->user();

        $users = User::where('id', '!=', $current->id)->where('is_active', true)
            ->where(function ($q) use ($request) {
                $q->where('username', 'like', "%{$request->query('query')}%")
                  ->orWhere('name', 'like', "%{$request->query('query')}%");
            })->select('id', 'name', 'username', 'avatar')->limit(20)->get();

        $onlineIds = collect($this->onlineUserIds($users->pluck('id')->all()))->flip();

        $users = $users->map(fn($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'avatar' => $user->avatar,
                'is_online' => $onlineIds->has($user->id),
                'relationship' => $this->relationshipTo($current, $user),
            ]);

        return response()->json(['status' => 'success', 'data' => $users]);
    }

    private function relationshipTo(User $current, User $other): string
    {
        $friendship = Friendship::where(function ($q) use ($current, $other) {
            $q->where(function ($q2) use ($current, $other) {
                $q2->where('sender_id', $current->id)->where('receiver_id', $other->id);
            })->orWhere(function ($q2) use ($current, $other) {
                $q2->where('sender_id', $other->id)->where('receiver_id', $current->id);
            });
        })->first();

        if (!$friendship) return 'none';
        if ($friendship->status === 'accepted') return 'friend';
        if ($friendship->status === 'pending' && $friendship->sender_id === $current->id) return 'sent';
        if ($friendship->status === 'pending') return 'received';

        return $friendship->status;
    }

    private function onlineUserIds(array $userIds): array
    {
        $userIds = array_values(array_unique(array_filter($userIds)));
        if (empty($userIds)) {
            return [];
        }

        $onlineAfter = now()->subMinutes(2);

        return PersonalAccessToken::query()
            ->where('tokenable_type', User::class)
            ->whereIn('tokenable_id', $userIds)
            ->where(function ($query) use ($onlineAfter) {
                $query->where('last_used_at', '>=', $onlineAfter)
                    ->orWhere('created_at', '>=', $onlineAfter);
            })
            ->pluck('tokenable_id')
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }
}
