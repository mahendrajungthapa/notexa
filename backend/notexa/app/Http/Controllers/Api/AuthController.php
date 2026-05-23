<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Auth\Events\Registered;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:30|unique:users,username|alpha_dash',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name' => $request->name,
            'username' => strtolower($request->username),
            'email' => strtolower($request->email),
            'password' => Hash::make($request->password),
        ]);

        $emailEnabled = SiteSetting::get('email_verification_enabled', false);
        if ($emailEnabled) {
            try { event(new Registered($user)); } catch (\Exception $e) { /* SMTP not configured, skip */ }
        } else {
            $user->markEmailAsVerified();
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Registration successful.',
            'user' => $user->fresh(),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $loginField = $request->input('login');
        $password = $request->input('password');

        // Find user by email OR username (case-insensitive)
        $user = User::where('email', strtolower($loginField))
            ->orWhere('username', strtolower($loginField))
            ->first();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'No account found with that username or email.',
            ], 401);
        }

        if (!Hash::check($password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Incorrect password. Please try again.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Your account has been deactivated. Contact admin.',
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'user' => $user->load('activeSubscription'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['status' => 'success', 'message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('activeSubscription');
        return response()->json([
            'status' => 'success',
            'user' => $user,
            'stats' => [
                'notes_count' => $user->notes()->where('is_trashed', false)->count(),
                'friends_count' => count($user->friends()),
                'shared_with_me' => $user->sharedNotes()->count(),
                'files_count' => $user->files()->count(),
                'storage_used_mb' => round($user->storage_used / 1048576, 2),
                'storage_limit_mb' => round($user->storage_limit / 1048576, 2),
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:30|alpha_dash|unique:users,username,' . $request->user()->id,
        ]);
        $request->user()->update($request->only(['name', 'username']));
        return response()->json(['status' => 'success', 'user' => $request->user()->fresh()]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        if (!Hash::check($request->current_password, $request->user()->password)) {
            return response()->json(['status' => 'error', 'message' => 'Current password is incorrect.'], 400);
        }
        $request->user()->update(['password' => Hash::make($request->password)]);
        return response()->json(['status' => 'success', 'message' => 'Password changed.']);
    }
}
