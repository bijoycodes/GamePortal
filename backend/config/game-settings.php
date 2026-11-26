<?php

// Validation rules mirror config/game-settings.schema.json in the repository root.
return [
    'max_properties' => 20,
    'max_serialized_bytes' => 8192,
    'rules' => [
        'requireFullscreen' => ['boolean'],
        'backgroundColor' => ['string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        'publisherId' => ['string', 'max:120'],
        'customCss' => ['string', 'max:4096'],
        'muteByDefault' => ['boolean'],
        'showFps' => ['boolean'],
        'controlsHint' => ['string', 'max:240'],
        'targetScore' => ['integer', 'min:0', 'max:100000000'],
    ],
    'event_rate_limit' => (int) env('GAME_EVENT_RATE_LIMIT', 60),
];
