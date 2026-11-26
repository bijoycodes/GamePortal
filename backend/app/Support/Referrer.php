<?php

namespace App\Support;

final class Referrer
{
    /** Store only the host of a referrer URL, never paths, queries or user info. */
    public static function sanitize(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $value = trim($value);
        if (! str_contains($value, '://')) {
            $value = 'https://'.$value;
        }

        $host = parse_url($value, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? mb_substr($host, 0, 512) : null;
    }
}
