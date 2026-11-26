<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\GameFile;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<GameFile> */
class GameFileFactory extends Factory
{
    protected $model = GameFile::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'upload_id' => null,
            'path' => 'index.html',
            'disk' => 'games',
            'mime' => 'text/html',
            'size' => fake()->numberBetween(128, 4096),
            'sha256' => str_repeat('a', 64),
            'is_entry' => true,
        ];
    }
}
