<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$basePath = dirname(__DIR__);
$compiledViewPath = $basePath . '/storage/framework/views';

foreach ([
    $basePath . '/storage/framework/cache/data',
    $basePath . '/storage/framework/sessions',
    $compiledViewPath,
    $basePath . '/storage/app/ocr',
    $basePath . '/storage/logs',
    $basePath . '/bootstrap/cache',
] as $path) {
    if (! is_dir($path)) {
        @mkdir($path, 0775, true);
    }
}

putenv('VIEW_COMPILED_PATH=' . $compiledViewPath);
$_ENV['VIEW_COMPILED_PATH'] = $compiledViewPath;
$_SERVER['VIEW_COMPILED_PATH'] = $compiledViewPath;

return Application::configure(basePath: $basePath)
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->remove(\Illuminate\Http\Middleware\HandleCors::class);

        $middleware->alias([
            'is_admin' => \App\Http\Middleware\IsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
