<?php

namespace App\Http\Requests;

use App\Enums\EventType;
use App\Rules\EventMetadata;
use App\Rules\RecentTimestamp;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::in(EventType::values())],
            'metadata' => ['nullable', 'array', new EventMetadata],
            'occurred_at' => ['required', 'string', new RecentTimestamp],
        ];
    }
}
