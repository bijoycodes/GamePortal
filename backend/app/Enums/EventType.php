<?php

namespace App\Enums;

enum EventType: string
{
    case Start = 'start';
    case End = 'end';
    case Score = 'score';
    case LevelComplete = 'level_complete';
    case Custom = 'custom';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function validationRule(): string
    {
        return 'in:'.implode(',', self::values());
    }
}
