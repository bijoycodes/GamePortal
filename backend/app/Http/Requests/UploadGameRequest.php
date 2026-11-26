<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'package' => [
                'required',
                'file',
                'mimes:zip',
                'mimetypes:application/zip,application/x-zip-compressed',
                'max:51200',
            ],
        ];
    }
}
