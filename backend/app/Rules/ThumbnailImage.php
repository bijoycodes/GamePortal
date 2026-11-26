<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

final class ThumbnailImage implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            $fail('The :attribute field must be a valid image.');

            return;
        }

        $size = @getimagesize($value->getRealPath());
        if ($size === false || $size[0] < 480 || $size[1] < 270) {
            $fail('The :attribute field must be at least 480x270 pixels.');
        }
    }
}
