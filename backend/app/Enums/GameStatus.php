<?php

namespace App\Enums;

enum GameStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Disabled = 'disabled';
    case Archived = 'archived';

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
