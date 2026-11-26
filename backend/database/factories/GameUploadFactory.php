<?php

namespace Database\Factories;

use App\Enums\UploadStatus;
use App\Models\Game;
use App\Models\GameUpload;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<GameUpload> */
class GameUploadFactory extends Factory
{
    protected $model = GameUpload::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'uploader_id' => null,
            'original_filename' => 'game.zip',
            'raw_path' => fn (array $attributes): string => sprintf('games/%s/raw/1-game.zip', fake()->uuid()),
            'disk' => 'games',
            'status' => UploadStatus::Published,
            'error_message' => null,
            'file_count' => 1,
            'total_size' => 1024,
            'processed_at' => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (): array => [
            'status' => UploadStatus::Pending,
            'processed_at' => null,
            'file_count' => 0,
            'total_size' => 0,
        ]);
    }
}
