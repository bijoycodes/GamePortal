<?php

namespace App\Support;

final class JsonDepth
{
    /** Maximum nesting depth of arrays/objects in a decoded JSON value. Scalars are depth 0. */
    public static function of(mixed $value): int
    {
        if (! is_array($value)) {
            return 0;
        }

        $depth = 0;
        foreach ($value as $child) {
            $depth = max($depth, 1 + self::of($child));
        }

        return $depth;
    }
}
