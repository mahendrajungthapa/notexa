<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class ProfileController extends Controller
{
    public function show(string $username)
    {
        $normalized = strtolower(ltrim(trim($username), '@'));

        $user = User::query()
            ->whereRaw('lower(username) = ?', [$normalized])
            ->first();

        if (!$user || !$user->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Profile not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'avatar' => $user->avatar,
                'institution' => $user->institution,
                'joined_at' => $user->created_at,
            ],
        ]);
    }
}
