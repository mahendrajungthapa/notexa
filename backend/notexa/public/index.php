<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

require __DIR__.'/../bootstrap/notexa_temp.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$isApiRequest = str_starts_with($requestPath, '/api/') || str_starts_with($requestPath, '/sanctum/');
$corsAllowed = false;

if ($origin && $isApiRequest) {
    $corsAllowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://notexa.cloud',
        'https://www.notexa.cloud',
        'https://app.notexa.cloud',
        'http://notexa.cloud',
        'http://www.notexa.cloud',
        'http://app.notexa.cloud',
    ];

    $corsAllowed = in_array($origin, $corsAllowedOrigins, true)
        || (bool) preg_match('#^https?://(localhost|127\.0\.0\.1|\[::1\]):[0-9]+$#', $origin);

    if ($corsAllowed) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers', false);
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: ' . ($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? 'Authorization, Content-Type, Accept, X-Requested-With'));
        header('Access-Control-Expose-Headers: Content-Disposition');
        header('Access-Control-Max-Age: 600');
    }
}

if ($isApiRequest && ($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code($corsAllowed ? 204 : 403);
    exit;
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
