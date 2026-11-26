<?php

namespace App\Http\Requests;

use App\Rules\RecentTimestamp;
use Illuminate\Foundation\Http\FormRequest;

class EndSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'duration_seconds' => ['required', 'integer', 'min:0', 'max:86400'],
            'ended_at' => ['required', 'string', new RecentTimestamp],
        ];
    }
}
