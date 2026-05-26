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
        ->sortBy(fn (array $route): string => $route['group'].' '.$route['uri'].' '.implode('', $route['methods']))
        ->values();

    return view('docs', [
        'baseUrl' => url('/api'),
        'generatedAt' => now()->format('Y-m-d H:i:s T'),
        'groupedRoutes' => $routes->groupBy('group'),
        'totalRoutes' => $routes->count(),
    ]);
})->name('docs');
