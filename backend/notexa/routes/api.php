<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\NoteShareController;
use App\Http\Controllers\Api\FriendController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Admin\AdminController;

// ═══ PUBLIC ═══
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/subscription/ipn', [SubscriptionController::class, 'handleIPN'])->name('payment.ipn');

Route::get('/settings/public', function () {
    return response()->json(['status' => 'success', 'data' => [
        'site_name' => \App\Models\SiteSetting::get('site_name', 'Notexa'),
        'site_logo' => \App\Models\SiteSetting::get('site_logo', ''),
        'site_description' => \App\Models\SiteSetting::get('site_description', 'Collaborative Note Taking Platform'),
        'privacy_policy' => \App\Models\SiteSetting::get('privacy_policy', ''),
        'terms_conditions' => \App\Models\SiteSetting::get('terms_conditions', ''),
        'about_us' => \App\Models\SiteSetting::get('about_us', ''),
    ]]);
});

Route::get('/files/{file}/content', [FileController::class, 'serve'])
    ->middleware('signed')
    ->name('api.files.content');

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
    Route::get('/notes/archived', [NoteController::class, 'archived']);
    Route::get('/notes/trashed', [NoteController::class, 'trashed']);
    Route::get('/notes/{note}', [NoteController::class, 'show']);
    Route::put('/notes/{note}', [NoteController::class, 'update']);
    Route::delete('/notes/{note}', [NoteController::class, 'destroy']);
    Route::post('/notes/{note}/restore', [NoteController::class, 'restore']);
    Route::delete('/notes/{note}/permanent', [NoteController::class, 'permanentDelete']);
    Route::patch('/notes/{note}/pin', [NoteController::class, 'togglePin']);
    Route::patch('/notes/{note}/archive', [NoteController::class, 'toggleArchive']);
    Route::get('/notes/{note}/versions', [NoteController::class, 'versions']);

    // Share code
    Route::get('/notes/{note}/share-code', [NoteController::class, 'getShareCode']);
    Route::post('/notes/{note}/regenerate-code', [NoteController::class, 'regenerateShareCode']);
    Route::post('/notes/redeem-code', [NoteController::class, 'redeemShareCode']);

    // AI Summary
    Route::post('/notes/{note}/ai-summary', [NoteController::class, 'aiSummary']);

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
    Route::delete('/friends/{userId}', [FriendController::class, 'removeFriend']);
    Route::get('/friends/search', [FriendController::class, 'searchUsers']);

    // Files
    Route::get('/files', [FileController::class, 'index']);
    Route::post('/files/upload', [FileController::class, 'upload']);
    Route::get('/files/{file}/download', [FileController::class, 'download']);
    Route::delete('/files/{file}', [FileController::class, 'destroy']);

    // Subscription
    Route::get('/subscription/plans', [SubscriptionController::class, 'plans']);
    Route::get('/subscription/my', [SubscriptionController::class, 'mySubscription']);
    Route::post('/subscription/subscribe', [SubscriptionController::class, 'subscribe']);
    Route::get('/subscription/payment-history', [SubscriptionController::class, 'paymentHistory']);
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

    Route::get('/payments', [AdminController::class, 'payments']);

    Route::get('/plans', [AdminController::class, 'plans']);
    Route::post('/plans', [AdminController::class, 'createPlan']);
    Route::put('/plans/{plan}', [AdminController::class, 'updatePlan']);
    Route::delete('/plans/{plan}', [AdminController::class, 'deletePlan']);

    Route::get('/settings', [AdminController::class, 'getSettings']);
    Route::put('/settings', [AdminController::class, 'updateSettings']);
    Route::post('/settings/smtp/test', [AdminController::class, 'testSmtp']);

    Route::get('/shared-notes', [AdminController::class, 'sharedNotes']);
    Route::get('/friendships', [AdminController::class, 'friendships']);
    Route::get('/activity-logs', [AdminController::class, 'activityLogs']);
});
