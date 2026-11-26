<?php

return [
    'default' => env('MAIL_MAILER', 'log'),
    'mailers' => [
        'log' => [
            'transport' => 'log',
        ],
        'array' => [
            'transport' => 'array',
        ],
    ],
    'from' => [
        'address' => 'noreply@gameportal.test',
        'name' => 'GamePortal',
    ],
];
