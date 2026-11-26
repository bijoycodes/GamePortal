<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Player = 'player';

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
