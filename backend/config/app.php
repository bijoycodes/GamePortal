<?php

return [
    'name' => env('APP_NAME', 'GamePortal'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost:8400'),
    'frontend_url' => env('APP_FRONTEND_URL', 'http://localhost:4300'),
    'game_host_url' => env('GAME_HOST_URL', 'http://127.0.0.1:8401'),
    'timezone' => 'UTC',
    'locale' => 'en',
    'fallback_locale' => 'en',
    'faker_locale' => 'en_US',
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
    'api_version' => '1.0.0',
    'maintenance' => [
        'driver' => 'file',
    ],
];
