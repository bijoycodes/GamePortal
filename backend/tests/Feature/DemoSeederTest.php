<?php

namespace Tests\Feature;

use App\Models\Game;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_a_playable_indexed_game(): void
    {
        Storage::fake('games');

        $this->seed(DatabaseSeeder::class);

        $game = Game::query()->where('slug', 'neon-runner')->firstOrFail();

        self::assertSame('index.html', $game->entry_file);
        self::assertSame(3, $game->files()->count());
        self::assertSame(1, $game->files()->where('is_entry', true)->count());
        self::assertSame(1, $game->uploads()->count());

        Storage::disk('games')->assertExists(
            sprintf('games/%s/files/index.html', $game->uuid),
        );
        Storage::disk('games')->assertExists(
            sprintf('games/%s/files/game.js', $game->uuid),
        );

        $response = $this->get('/g/neon-runner/index.html')->assertOk();
        self::assertStringContainsString($game->title, $response->streamedContent());

        $this->get('/g/neon-runner/game.js')->assertOk();
    }

    public function test_seeder_does_not_duplicate_files_on_repeat_runs(): void
    {
        Storage::fake('games');

        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $game = Game::query()->where('slug', 'neon-runner')->firstOrFail();

        self::assertSame(3, Game::query()->count());
        self::assertSame(3, $game->files()->count());
        self::assertSame(1, $game->uploads()->count());
    }
}
