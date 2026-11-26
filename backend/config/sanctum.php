<?php

use Illuminate\Foundation\Http\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;

$statefulHosts = array_values(array_filter([
    parse_url((string) env('APP_URL', 'http://localhost:8400'), PHP_URL_HOST),
    parse_url((string) env('APP_FRONTEND_URL', 'http://localhost:4300'), PHP_URL_HOST),
]));

return [
    'stateful' => $statefulHosts,
    'guard' => ['web'],
    'expiration' => 60 * 24 * 30,
    'token_prefix' => '',
    'middleware' => [
        'verify_csrf_token' => VerifyCsrfToken::class,
        'encrypt_cookies' => EncryptCookies::class,
    ],
];
