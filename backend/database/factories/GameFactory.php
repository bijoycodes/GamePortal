<?php

namespace Database\Factories;

use App\Enums\GameStatus;
use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Game> */
class GameFactory extends Factory
{
    protected $model = Game::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $title = fake()->unique()->words(3, true);

        return [
            'uuid' => fake()->uuid(),
            'title' => ucfirst($title),
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)),
            'description' => fake()->sentence(),
            'instructions' => 'Use the arrow keys to play.',
            'category_id' => null,
            'thumbnail_path' => null,
            'status' => GameStatus::Published,
            'featured' => false,
            'orientation' => 'any',
            'width' => 1280,
            'height' => 720,
            'entry_file' => 'index.html',
            'version' => '1.0.0',
            'developer' => fake()->company(),
            'release_year' => fake()->numberBetween(1980, 2026),
            'license_name' => 'MIT',
            'license_url' => 'https://opensource.org/license/mit',
            'attribution' => null,
            'settings' => [],
            'published_at' => fn (array $attributes) => self::statusValue($attributes) === GameStatus::Published->value
                ? fake()->dateTimeBetween('-60 days', 'now')
                : null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (): array => ['status' => GameStatus::Draft, 'published_at' => null]);
    }

    public function disabled(): static
    {
        return $this->state(fn (): array => ['status' => GameStatus::Disabled]);
    }

    /** @param array<string, mixed> $attributes */
    private static function statusValue(array $attributes): string
    {
        $status = $attributes['status'] ?? GameStatus::Published;

        return $status instanceof GameStatus ? $status->value : (string) $status;
    }
}
