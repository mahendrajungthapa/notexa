<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SiteSetting;
use App\Services\MailSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules\Password;
use Throwable;

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
            try {
                $this->sendVerificationCode($user);
            } catch (Throwable $e) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Account created, but the verification code could not be sent. Please ask an admin to check SMTP settings, then resend verification.',
                    'email_verification_required' => true,
                    'email' => $user->email,
                ], 503);
            }

            return response()->json([
                'status' => 'success',
                'email_verification_required' => true,
                'email' => $user->email,
                'message' => 'Account created. Enter the 6-digit verification code sent to your email.',
            ], 201);
        }

        $user->markEmailAsVerified();
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

        if (SiteSetting::get('email_verification_enabled', false) && !$user->hasVerifiedEmail()) {
            return response()->json([
                'status' => 'error',
                'code' => 'email_not_verified',
                'email' => $user->email,
                'message' => 'Please verify your email before signing in.',
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'user' => $user->fresh(),
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
        $user = $request->user();
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

    public function completeStreak(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();
        $lastDate = optional($user->last_streak_date)->toDateString();

        if ($lastDate !== $today) {
            $user->forceFill([
                'streak_count' => $lastDate === $yesterday ? ((int) $user->streak_count + 1) : 1,
                'last_streak_date' => $today,
            ])->save();
        }

        return response()->json([
            'status' => 'success',
            'message' => $lastDate === $today ? 'Study streak already completed today.' : 'Study streak completed.',
            'user' => $user->fresh(),
            'streak_count' => (int) $user->fresh()->streak_count,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'institution' => 'sometimes|nullable|string|max:255',
            'username' => 'sometimes|string|max:30|alpha_dash|unique:users,username,' . $request->user()->id,
        ]);
        $request->user()->update($request->only(['name', 'username', 'institution']));
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

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate(['email' => 'required|email']);
        $user = User::where('email', strtolower($validated['email']))->first();

        if (!$user) {
            return response()->json([
                'status' => 'success',
                'message' => 'If that account exists, a reset code will be sent.',
            ]);
        }

        if (!MailSettingsService::hasSmtpConfig()) {
            return response()->json([
                'status' => 'error',
                'message' => 'SMTP is not configured. Please ask an admin to update SMTP settings.',
            ], 503);
        }

        try {
            $this->sendPasswordResetCode($user);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Password reset code could not be sent. Please ask an admin to check SMTP settings.',
            ], 503);
        }

        return response()->json([
            'status' => 'success',
            'email' => $user->email,
            'message' => 'A 6-digit password reset code was sent to your email.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|digits:6',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::where('email', strtolower($validated['email']))->first();

        if (!$user || !$user->password_reset_code_hash) {
            return response()->json(['status' => 'error', 'message' => 'Invalid or expired reset code.'], 422);
        }

        if (!$user->password_reset_code_expires_at || now()->greaterThan($user->password_reset_code_expires_at)) {
            return response()->json(['status' => 'error', 'message' => 'Reset code expired. Please request a new code.'], 422);
        }

        if (!Hash::check($validated['code'], $user->password_reset_code_hash)) {
            return response()->json(['status' => 'error', 'message' => 'Invalid or expired reset code.'], 422);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'password_reset_code_hash' => null,
            'password_reset_code_expires_at' => null,
        ])->save();

        $user->tokens()->delete();

        return response()->json(['status' => 'success', 'message' => 'Password reset successfully. Please sign in with your new password.']);
    }

    public function resendVerification(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        if (!SiteSetting::get('email_verification_enabled', false)) {
            return response()->json(['status' => 'success', 'message' => 'Email verification is currently disabled.']);
        }

        $user = User::where('email', strtolower($request->email))->first();

        if (!$user) {
            return response()->json(['status' => 'success', 'message' => 'If that account exists, a verification email will be sent.']);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['status' => 'success', 'message' => 'This email is already verified.']);
        }

        try {
            $this->sendVerificationCode($user);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Verification code could not be sent. Please ask an admin to check SMTP settings.',
                'email_verification_required' => true,
                'email' => $user->email,
            ], 503);
        }

        return response()->json(['status' => 'success', 'message' => 'A new 6-digit verification code was sent.']);
    }

    public function verifyCode(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|digits:6',
        ]);

        $user = User::where('email', strtolower($validated['email']))->first();

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Invalid verification code.'], 422);
        }

        if ($user->hasVerifiedEmail()) {
            $token = $user->createToken('auth-token')->plainTextToken;
            return response()->json(['status' => 'success', 'message' => 'Email is already verified.', 'user' => $user->fresh(), 'token' => $token]);
        }

        if (!$user->email_verification_code_hash || !$user->email_verification_code_expires_at || now()->greaterThan($user->email_verification_code_expires_at)) {
            return response()->json(['status' => 'error', 'message' => 'Verification code expired. Please request a new code.'], 422);
        }

        if (!Hash::check($validated['code'], $user->email_verification_code_hash)) {
            return response()->json(['status' => 'error', 'message' => 'Invalid verification code.'], 422);
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'email_verification_code_hash' => null,
            'email_verification_code_expires_at' => null,
        ])->save();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Email verified successfully.',
            'user' => $user->fresh(),
            'token' => $token,
        ]);
    }

    private function sendVerificationCode(User $user): void
    {
        if (!MailSettingsService::hasSmtpConfig()) {
            throw new \RuntimeException('SMTP host is required before sending verification codes.');
        }

        $code = (string) random_int(100000, 999999);

        $user->forceFill([
            'email_verification_code_hash' => Hash::make($code),
            'email_verification_code_expires_at' => now()->addMinutes(15),
        ])->save();

        MailSettingsService::apply();

        $siteName = SiteSetting::get('site_name', 'Notexa');
        Mail::raw(
            "Your {$siteName} verification code is {$code}.\n\nThis code expires in 15 minutes. If you did not create an account, you can ignore this email.",
            function ($message) use ($user, $siteName) {
                $message->to($user->email, $user->name)
                    ->subject("{$siteName} verification code");
            }
        );
    }

    private function sendPasswordResetCode(User $user): void
    {
        if (!MailSettingsService::hasSmtpConfig()) {
            throw new \RuntimeException('SMTP host is required before sending password reset codes.');
        }

        $code = (string) random_int(100000, 999999);

        $user->forceFill([
            'password_reset_code_hash' => Hash::make($code),
            'password_reset_code_expires_at' => now()->addMinutes(15),
        ])->save();

        MailSettingsService::apply();

        $siteName = SiteSetting::get('site_name', 'Notexa');
        Mail::raw(
            "Your {$siteName} password reset code is {$code}.\n\nThis code expires in 15 minutes. If you did not request a password reset, you can ignore this email.",
            function ($message) use ($user, $siteName) {
                $message->to($user->email, $user->name)
                    ->subject("{$siteName} password reset code");
            }
        );
    }
}
