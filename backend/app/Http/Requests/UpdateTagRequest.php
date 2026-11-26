<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $tag = $this->route('tag');

        return [
            'name' => ['sometimes', 'string', 'max:80', Rule::unique('tags', 'name')->ignore($tag)],
            'slug' => [
                'sometimes',
                'string',
                'max:100',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('tags', 'slug')->ignore($tag),
            ],
        ];
    }
}
