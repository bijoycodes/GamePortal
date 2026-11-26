<?php

namespace App\Rules;

use App\Support\JsonDepth;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

final class EventMetadata implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            $fail('The :attribute field must be an object.');

            return;
        }

        $encoded = json_encode($value);
        if ($encoded === false || strlen($encoded) > 8192) {
            $fail('The :attribute field must not exceed 8192 bytes when serialized.');

            return;
        }

        if (JsonDepth::of($value) > 3) {
            $fail('The :attribute field must not be nested deeper than 3 levels.');
        }
    }
}
