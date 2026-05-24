<?php

$defaultCorsOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://notexa.cloud',
    'https://www.notexa.cloud',
    'https://app.notexa.cloud',
];

$configuredCorsOrigins = array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', '')))));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_unique(array_filter(array_merge($defaultCorsOrigins, $configuredCorsOrigins)))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
