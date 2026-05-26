<?php

use Illuminate\Routing\Route as RouteDefinition;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'ok',
        'name' => 'Notexa API',
        'docs' => url('/docs'),
    ]);
});

Route::get('/docs', function () {
    $describeRoute = static function (string $uri, array $methods): string {
        $method = $methods[0] ?? 'GET';

        return match (true) {
            $uri === 'api/register' => 'Create a new user account. Returns an auth token when email verification is disabled.',
            $uri === 'api/login' => 'Sign in with username or email and password.',
            $uri === 'api/logout' => 'Revoke the current Sanctum token.',
            $uri === 'api/me' => 'Return the authenticated user profile and dashboard counters.',
            $uri === 'api/streak/complete' => 'Mark the current local study day as complete after the frontend focus timer finishes.',
            $uri === 'api/forgot-password' => 'Send a 6-digit password reset code through configured SMTP.',
            $uri === 'api/reset-password' => 'Reset a password using the emailed 6-digit reset code.',
            $uri === 'api/email/verification-notification' => 'Send or resend a 6-digit email verification code.',
            $uri === 'api/email/verify-code' => 'Verify a user email address using the 6-digit code.',
            $uri === 'api/settings/public' => 'Read public site settings used by the frontend.',
            $uri === 'api/profile' => 'Update the authenticated user profile.',
            $uri === 'api/change-password' => 'Change the authenticated user password.',
            $uri === 'api/profiles/{username}' => 'Read a public profile page by username.',
            $uri === 'api/notes' && $method === 'GET' => 'List owned notes with pagination and filters.',
            $uri === 'api/notes' && $method === 'POST' => 'Create a new note.',
            $uri === 'api/notes/trashed' => 'List notes currently in trash.',
            preg_match('#^api/notes/\{note\}$#', $uri) === 1 && $method === 'GET' => 'Read one note, including share access checks.',
            preg_match('#^api/notes/\{note\}$#', $uri) === 1 && $method === 'PUT' => 'Update note content, title, color, and metadata.',
            preg_match('#^api/notes/\{note\}$#', $uri) === 1 && $method === 'DELETE' => 'Move a note to trash.',
            str_contains($uri, '/versions') => 'List or restore saved note versions.',
            str_contains($uri, '/presence') => 'Realtime collaboration presence and typing heartbeat.',
            str_contains($uri, '/share-code') || str_contains($uri, '/regenerate-code') || $uri === 'api/notes/redeem-code' => 'Direct collaboration access through share codes.',
            str_contains($uri, '/ai-summary') => 'Generate an AI summary using admin-configured AI keys.',
            str_contains($uri, '/ai-query') => 'Run an AI writing/query request for the note.',
            str_contains($uri, '/ocr') => 'Extract text from an uploaded image. Frontend can fall back to browser OCR.',
            str_contains($uri, '/share') && str_contains($uri, 'notes') => 'Manage note sharing and collaborator permissions.',
            $uri === 'api/shared-with-me' => 'List notes shared with the authenticated user.',
            str_starts_with($uri, 'api/friends') => 'Manage friend requests, accepted friends, and user search.',
            $uri === 'api/files' => 'List owned uploaded files.',
            $uri === 'api/files/shared-with-me' => 'List files shared with the authenticated user.',
            $uri === 'api/files/upload' => 'Upload a file with JSON base64 fallback or multipart data.',
            str_contains($uri, '/download') => 'Create or return a secure file download URL.',
            str_contains($uri, '/preview') || str_contains($uri, '/content') => 'Serve secure file preview content.',
            str_contains($uri, 'api/files') && str_contains($uri, '/share') => 'Manage file sharing.',
            str_starts_with($uri, 'api/admin/settings') => 'Read or update admin-controlled site, SMTP, storage, logo, and AI settings.',
            str_starts_with($uri, 'api/admin/users') => 'Admin user listing, profile review, activation, and deletion.',
            str_starts_with($uri, 'api/admin/notes') => 'Admin note moderation and listing.',
            str_starts_with($uri, 'api/admin') => 'Admin-only analytics and operational data.',
            default => 'Registered Notexa API endpoint.',
        };
    };

    $requestHint = static function (string $uri, array $methods): string {
        $method = $methods[0] ?? 'GET';

        if (in_array($method, ['GET', 'DELETE'], true)) {
            return 'No JSON body';
        }

        return match (true) {
            $uri === 'api/register' => '{ name, username, email, password, password_confirmation }',
            $uri === 'api/login' => '{ login, password }',
            $uri === 'api/streak/complete' => '{ streak_date?: YYYY-MM-DD, timezone?: IANA timezone }',
            $uri === 'api/forgot-password' || $uri === 'api/email/verification-notification' => '{ email }',
            $uri === 'api/reset-password' => '{ email, code, password, password_confirmation }',
            $uri === 'api/email/verify-code' => '{ email, code }',
            $uri === 'api/profile' => '{ name?, username?, institution? }',
            $uri === 'api/change-password' => '{ current_password, password, password_confirmation }',
            $uri === 'api/notes' => '{ title, content?, plain_text?, color? }',
            preg_match('#^api/notes/\{note\}$#', $uri) === 1 => '{ title?, content?, plain_text?, color?, is_pinned? }',
            $uri === 'api/notes/redeem-code' => '{ code }',
            str_contains($uri, '/ai-query') => '{ systemPrompt, userPrompt }',
            str_contains($uri, '/ocr') => '{ image: data-url/base64 }',
            str_contains($uri, '/share') && str_contains($uri, 'notes') => '{ username or user_id, permission: view|edit }',
            str_contains($uri, '/presence') => '{ client_id?, name?, username?, isEditing? }',
            $uri === 'api/friends/request' => '{ username }',
            $uri === 'api/files/upload' => '{ file_base64, original_name, mime_type, size, note_id? }',
            str_contains($uri, 'api/files') && str_contains($uri, '/share') => '{ user_id }',
            $uri === 'api/admin/settings' => '{ settings: { key: value } }',
            $uri === 'api/admin/settings/logo' => 'multipart/form-data: logo',
            $uri === 'api/admin/settings/smtp/test' => '{ email }',
            str_starts_with($uri, 'api/admin/users') => '{ name?, email?, role?, is_active?, email_verified_at? }',
            default => 'See controller validation',
        };
    };

    $routes = collect(Route::getRoutes())
        ->filter(fn (RouteDefinition $route): bool => str_starts_with($route->uri(), 'api/'))
        ->map(function (RouteDefinition $route): array {
            $uri = $route->uri();
            $middleware = array_values(array_unique(array_map(
                static fn (mixed $middleware): string => is_string($middleware) ? $middleware : 'closure',
                $route->gatherMiddleware()
            )));
            $methods = array_values(array_filter(
                $route->methods(),
                static fn (string $method): bool => $method !== 'HEAD'
            ));
            $action = $route->getAction('controller') ?: $route->getActionName();

            return [
                'methods' => $methods,
                'uri' => $uri,
                'url' => url($uri),
                'name' => $route->getName() ?: '-',
                'action' => str_replace('App\\Http\\Controllers\\', '', $action === 'Closure' ? 'Route closure' : $action),
                'middleware' => $middleware,
                'access' => match (true) {
                    in_array('is_admin', $middleware, true) => 'Admin',
                    in_array('auth:sanctum', $middleware, true) => 'Bearer token',
                    in_array('signed', $middleware, true) => 'Signed URL',
                    default => 'Public',
                },
                'group' => match (true) {
                    str_starts_with($uri, 'api/admin') => 'Admin',
                    str_contains($uri, 'files') => 'Files',
                    str_contains($uri, 'friends') => 'Friends',
                    str_contains($uri, 'notes') || $uri === 'api/shared-with-me' => 'Notes',
                    str_contains($uri, 'profiles') || str_contains($uri, 'profile') => 'Profiles',
                    str_contains($uri, 'settings') => 'Settings',
                    default => 'Auth',
                },
            ];
        })
        ->map(fn (array $route): array => $route + [
            'description' => $describeRoute($route['uri'], $route['methods']),
            'request' => $requestHint($route['uri'], $route['methods']),
        ])
        ->sortBy(fn (array $route): string => $route['group'].' '.$route['uri'].' '.implode('', $route['methods']))
        ->values();

    $methodTotals = $routes
        ->flatMap(fn (array $route): array => $route['methods'])
        ->countBy()
        ->sortKeys();

    return view('docs', [
        'baseUrl' => url('/api'),
        'generatedAt' => now()->format('Y-m-d H:i:s T'),
        'groupedRoutes' => $routes->groupBy('group'),
        'methodTotals' => $methodTotals,
        'totalRoutes' => $routes->count(),
    ]);
})->name('docs');
