<?php

namespace App\Http\Resources;

use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/** @mixin Game */
class GameResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'instructions' => $this->instructions,
            'category' => $this->category === null ? null : [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ],
            'tags' => $this->tags->map(fn ($tag): array => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
            ])->values()->all(),
            'thumbnail_url' => $this->thumbnailUrl(),
            'status' => $this->status?->value,
            'featured' => (bool) $this->featured,
            'orientation' => $this->orientation?->value,
            'width' => $this->width,
            'height' => $this->height,
            'version' => $this->version,
            'developer' => $this->developer,
            'release_year' => $this->release_year,
            'license' => [
                'name' => $this->license_name,
                'url' => $this->license_url,
                'attribution' => $this->attribution,
            ],
            'settings' => (object) ($this->settings ?? []),
            'player_url' => $this->playerUrl(),
            'published_at' => $this->published_at?->toJSON(),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }

    private function thumbnailUrl(): ?string
    {
        if (! $this->thumbnail_path) {
            return null;
        }

        if (config('filesystems.disks.games.driver') === 's3') {
            try {
                return Storage::disk('games')->temporaryUrl($this->thumbnail_path, now()->addMinutes(30));
            } catch (\RuntimeException) {
                // Fall through to a signed API URL when the S3 client cannot sign.
            }
        }

        return URL::temporarySignedRoute(
            'thumbnail.show',
            now()->addMinutes(30),
            ['path' => ltrim($this->thumbnail_path, '/')],
        );
    }

    private function playerUrl(): string
    {
        $base = rtrim((string) config('app.game_host_url'), '/');
        $url = $base.'/g/'.$this->slug;

        if ($this->entry_file) {
            $segments = array_map('rawurlencode', explode('/', ltrim($this->entry_file, '/')));
            $url .= '/'.implode('/', $segments);
        }

        return $url;
    }
}
