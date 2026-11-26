<?php

namespace App\Http\Requests\Concerns;

use App\Enums\GameOrientation;
use App\Rules\GameSettings;
use App\Rules\ThumbnailImage;
use Illuminate\Validation\Rule;

trait GamePayloadRules
{
    /** @return array<string, array<int, mixed>> */
    protected function gameRules(bool $required): array
    {
        $prefix = $required ? 'required' : 'sometimes';

        return [
            'title' => [$prefix, 'string', 'max:180'],
            'slug' => ['sometimes', 'string', 'max:200', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'description' => ['nullable', 'string', 'max:5000'],
            'instructions' => ['nullable', 'string', 'max:5000'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'tag_ids' => ['nullable', 'array', 'max:20'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'orientation' => ['nullable', 'string', Rule::in(GameOrientation::values())],
            'width' => ['nullable', 'integer', 'min:1', 'max:8192'],
            'height' => ['nullable', 'integer', 'min:1', 'max:8192'],
            'version' => ['nullable', 'string', 'max:40'],
            'developer' => ['nullable', 'string', 'max:120'],
            'release_year' => ['nullable', 'integer', 'min:1980', 'max:'.(now()->year + 1)],
            'license_name' => ['nullable', 'string', 'max:120'],
            'license_url' => ['nullable', 'string', 'max:512', 'regex:/^https?:\/\//i'],
            'attribution' => ['nullable', 'string', 'max:5000'],
            'featured' => ['nullable', 'boolean'],
            'settings' => ['nullable', 'array', new GameSettings],
            'thumbnail' => [
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:2048',
                new ThumbnailImage,
            ],
        ];
    }
}
