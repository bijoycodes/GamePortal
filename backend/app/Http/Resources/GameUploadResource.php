<?php

namespace App\Http\Resources;

use App\Models\GameUpload;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GameUpload */
class GameUploadResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'game_id' => $this->game_id,
            'original_filename' => $this->original_filename,
            'status' => $this->status?->value,
            'error_message' => $this->error_message,
            'file_count' => $this->file_count,
            'total_size' => $this->total_size,
            'processed_at' => $this->processed_at?->toJSON(),
            'created_at' => $this->created_at?->toJSON(),
        ];
    }
}
