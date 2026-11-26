<?php

namespace App\Http\Requests;

use App\Enums\GameSort;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GameIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:140'],
            'tag' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'string', Rule::in(GameSort::values())],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
