<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\NoteShareController;
use App\Http\Controllers\Api\FriendController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Admin\AdminController;

// ═══ PUBLIC ═══
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('throttle:6,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])
    ->middleware('throttle:10,1');
Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
    ->middleware('throttle:6,1');
Route::post('/email/verify-code', [AuthController::class, 'verifyCode'])
    ->middleware('throttle:10,1');

Route::get('/settings/public', function () {
    return response()->json(['status' => 'success', 'data' => [
        'site_name' => \App\Models\SiteSetting::get('site_name', 'Notexa'),
        'site_logo' => \App\Models\SiteSetting::get('site_logo', ''),
        'site_description' => \App\Models\SiteSetting::get('site_description', 'Collaborative Note Taking Platform'),
        'privacy_policy' => \App\Models\SiteSetting::get('privacy_policy', ''),
        'terms_conditions' => \App\Models\SiteSetting::get('terms_conditions', ''),
        'about_us' => \App\Models\SiteSetting::get('about_us', ''),
        'ai_enabled' => \App\Models\SiteSetting::get('ai_enabled', true),
    ]]);
});

Route::get('/files/{file}/content', [FileController::class, 'serve'])
    ->middleware('signed')
    ->name('api.files.content');
Route::get('/files/{file}/preview-content', [FileController::class, 'previewContent'])
    ->middleware('signed')
    ->name('api.files.preview');

// ═══ AUTHENTICATED ═══
Route::middleware('auth:sanctum')->group(function () {

    // Auth & Profile
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/change-password', [AuthController::class, 'changePassword']);

    // Notes
    Route::get('/notes', [NoteController::class, 'index']);
    Route::post('/notes', [NoteController::class, 'store']);
    Route::get('/notes/trashed', [NoteController::class, 'trashed']);
    Route::get('/notes/{note}', [NoteController::class, 'show']);
    Route::put('/notes/{note}', [NoteController::class, 'update']);
    Route::delete('/notes/{note}', [NoteController::class, 'destroy']);
    Route::get('/notes/{note}/presence', [NoteController::class, 'collabPresence']);
    Route::post('/notes/{note}/presence', [NoteController::class, 'collabHeartbeat'])
        ->middleware('throttle:120,1');
    Route::post('/notes/{note}/restore', [NoteController::class, 'restore']);
    Route::delete('/notes/{note}/permanent', [NoteController::class, 'permanentDelete']);
    Route::patch('/notes/{note}/pin', [NoteController::class, 'togglePin']);
    Route::get('/notes/{note}/versions', [NoteController::class, 'versions']);

    // Share code
    Route::get('/notes/{note}/share-code', [NoteController::class, 'getShareCode']);
    Route::post('/notes/{note}/regenerate-code', [NoteController::class, 'regenerateShareCode']);
    Route::post('/notes/redeem-code', [NoteController::class, 'redeemShareCode']);

    // AI Summary
    Route::post('/notes/{note}/ai-summary', [NoteController::class, 'aiSummary']);
    Route::post('/notes/{note}/ai-query', [NoteController::class, 'aiQuery']);

    // Note Sharing
    Route::get('/shared-with-me', [NoteShareController::class, 'sharedWithMe']);
    Route::post('/notes/{note}/share', [NoteShareController::class, 'share']);
    Route::put('/notes/{note}/share/{userId}', [NoteShareController::class, 'updatePermission']);
    Route::delete('/notes/{note}/share/{userId}', [NoteShareController::class, 'unshare']);
    Route::get('/notes/{note}/collaborators', [NoteShareController::class, 'collaborators']);

    // Friends (by username)
    Route::get('/friends', [FriendController::class, 'index']);
    Route::get('/friends/requests', [FriendController::class, 'pendingRequests']);
    Route::post('/friends/request', [FriendController::class, 'sendRequest']);
    Route::put('/friends/accept/{friendship}', [FriendController::class, 'acceptRequest']);
    Route::put('/friends/reject/{friendship}', [FriendController::class, 'rejectRequest']);
    Route::delete('/friends/request/{friendship}', [FriendController::class, 'cancelRequest']);
    Route::delete('/friends/{userId}', [FriendController::class, 'removeFriend']);
    Route::get('/friends/search', [FriendController::class, 'searchUsers']);

    // Files
    Route::get('/files', [FileController::class, 'index']);
    Route::get('/files/shared-with-me', [FileController::class, 'sharedWithMe']);
    Route::post('/files/upload', [FileController::class, 'upload']);
    Route::get('/files/{file}/download', [FileController::class, 'download']);
    Route::get('/files/{file}/preview', [FileController::class, 'preview']);
    Route::get('/files/{file}/shares', [FileController::class, 'shares']);
    Route::post('/files/{file}/share', [FileController::class, 'share']);
    Route::delete('/files/{file}/share/{userId}', [FileController::class, 'unshare']);
    Route::delete('/files/{file}', [FileController::class, 'destroy']);

});

// ═══ ADMIN ═══
Route::middleware(['auth:sanctum', 'is_admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);

    Route::get('/users', [AdminController::class, 'users']);
    Route::get('/users/{user}', [AdminController::class, 'userDetail']);
    Route::put('/users/{user}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);

    Route::get('/notes', [AdminController::class, 'notes']);
    Route::delete('/notes/{note}', [AdminController::class, 'deleteNote']);

    Route::get('/settings', [AdminController::class, 'getSettings']);
    Route::put('/settings', [AdminController::class, 'updateSettings']);
    Route::post('/settings/logo', [AdminController::class, 'uploadLogo']);
    Route::post('/settings/smtp/test', [AdminController::class, 'testSmtp']);

    Route::get('/shared-notes', [AdminController::class, 'sharedNotes']);
    Route::get('/friendships', [AdminController::class, 'friendships']);
    Route::get('/activity-logs', [AdminController::class, 'activityLogs']);
});
