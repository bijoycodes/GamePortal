<?php

namespace App\Support;

final class TokenGenerator
{
    /** Opaque base64url token: 48 random bytes encoded to exactly 64 characters. */
    public static function sessionToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
    }
}
