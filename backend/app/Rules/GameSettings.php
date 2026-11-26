<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Validator;

final class GameSettings implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            $fail('The :attribute field must be an object.');

            return;
        }

        if (count($value) > (int) config('game-settings.max_properties', 20)) {
            $fail('The :attribute field contains too many properties.');

            return;
        }

        $encoded = json_encode($value);
        if ($encoded === false || strlen($encoded) > (int) config('game-settings.max_serialized_bytes', 8192)) {
            $fail('The :attribute field is too large.');

            return;
        }

        $validator = Validator::make($value, (array) config('game-settings.rules', []));
        if ($validator->fails()) {
            $fail('The :attribute field has invalid values. '.implode(' ', $validator->errors()->all()));
        }
    }
}
