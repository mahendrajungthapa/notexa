<?php

$defaultCorsOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://notexa.cloud',
    'https://www.notexa.cloud',
    'https://app.notexa.cloud',
    'http://notexa.cloud',
    'http://www.notexa.cloud',
    'http://app.notexa.cloud',
];

$configuredCorsOrigins = array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', '')))));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_unique(array_filter(array_merge($defaultCorsOrigins, $configuredCorsOrigins)))),
    'allowed_origins_patterns' => [
        '#^https?://(localhost|127\.0\.0\.1|\[::1\]):[0-9]+$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['Content-Disposition'],
    'max_age' => 600,
    'supports_credentials' => false,
];
