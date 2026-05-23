<?php
// config/services.php
return [
    'apinepal' => [
        'public_key' => env('APINEPAL_PUBLIC_KEY', ''),
        'secret_key' => env('APINEPAL_SECRET_KEY', ''),
        'mode' => env('APINEPAL_MODE', 'test'),
    ],
];
