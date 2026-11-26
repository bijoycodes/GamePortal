<?php

namespace App\Enums;

enum GameSort: string
{
    case Popular = 'popular';
    case Newest = 'newest';
    case Title = 'title';

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
