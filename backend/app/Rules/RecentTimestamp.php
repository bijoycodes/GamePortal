<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Carbon;

final class RecentTimestamp implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute field must be a valid timestamp.');

            return;
        }

        try {
            $timestamp = Carbon::parse($value);
        } catch (\Throwable) {
            $fail('The :attribute field must be a valid timestamp.');

            return;
        }

        if ($timestamp->lt(now()->subMinutes(5)) || $timestamp->gt(now()->addMinutes(5))) {
            $fail('The :attribute field must be within 5 minutes of the current time.');
        }
    }
}
