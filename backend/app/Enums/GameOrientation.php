<?php

namespace App\Enums;

enum GameOrientation: string
{
    case Landscape = 'landscape';
    case Portrait = 'portrait';
    case Any = 'any';

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
