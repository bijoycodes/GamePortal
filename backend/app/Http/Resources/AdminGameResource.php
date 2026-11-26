<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminGameResource extends GameResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'entry_file' => $this->entry_file,
            'deleted_at' => $this->deleted_at?->toJSON(),
            'uploads' => GameUploadResource::collection($this->uploads()->latest()->get()),
            'files' => $this->files->map(fn ($file): array => [
                'id' => $file->id,
                'path' => $file->path,
                'mime' => $file->mime,
                'size' => $file->size,
                'is_entry' => (bool) $file->is_entry,
            ])->values()->all(),
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
        ]);
    }
}
