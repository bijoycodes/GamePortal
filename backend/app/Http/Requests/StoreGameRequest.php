<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\GamePayloadRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreGameRequest extends FormRequest
{
    use GamePayloadRules;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return $this->gameRules(true);
    }
}
