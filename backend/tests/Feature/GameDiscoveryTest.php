<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Game;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class GameDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::factory()->create(['slug' => 'action', 'name' => 'Action']);
        $tag = Tag::factory()->create(['slug' => 'arcade', 'name' => 'arcade']);

        $runner = Game::factory()->create([
            'title' => 'Neon Runner',
            'slug' => 'neon-runner',
            'category_id' => $category->id,
            'featured' => true,
            'published_at' => now()->subDays(10),
        ]);
        $runner->tags()->attach($tag);

        Game::factory()->create([
            'title' => 'Tile Puzzler',
            'slug' => 'tile-puzzler',
            'published_at' => now()->subDay(),
        ]);
        Game::factory()->draft()->create(['slug' => 'hidden-game', 'title' => 'Hidden Game']);
    }

    public function test_index_returns_only_published_games_with_documented_shape(): void
    {
        $response = $this->getJson('/api/games');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'from', 'last_page', 'per_page', 'total'],
            ]);

        $this->getJson('/api/games/neon-runner')
            ->assertOk()
            ->assertJsonStructure([
                'id', 'uuid', 'title', 'slug', 'description', 'instructions',
                'category' => ['id', 'name', 'slug'],
                'tags' => [['id', 'name', 'slug']],
                'thumbnail_url', 'status', 'featured', 'orientation', 'width', 'height',
                'version', 'developer', 'release_year',
                'license' => ['name', 'url', 'attribution'],
                'settings', 'player_url', 'published_at', 'created_at', 'updated_at',
            ]);

        $slugs = array_column($response->json('data'), 'slug');
        self::assertSame(['tile-puzzler', 'neon-runner'], $slugs);
        self::assertSame(2, $response->json('meta.total'));
    }

    public function test_player_url_uses_game_host_origin(): void
    {
        $response = $this->getJson('/api/games/neon-runner');

        $response->assertOk()->assertJsonPath('player_url', 'http://127.0.0.1:8401/g/neon-runner/index.html');
    }

    public function test_filters_and_pagination(): void
    {
        self::assertCount(1, $this->getJson('/api/games?q=neon')->json('data'));
        self::assertCount(1, $this->getJson('/api/games?category=action')->json('data'));
        self::assertCount(1, $this->getJson('/api/games?tag=arcade')->json('data'));
        self::assertSame('tile-puzzler', $this->getJson('/api/games?sort=newest')->json('data.0.slug'));

        $page = $this->getJson('/api/games?per_page=1&page=2');
        $page->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.total', 2);
        self::assertCount(1, $page->json('data'));
    }

    public function test_unpublished_game_is_hidden(): void
    {
        $this->getJson('/api/games/hidden-game')
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND');

        $slugs = array_column($this->getJson('/api/games')->json('data'), 'slug');
        self::assertNotContains('hidden-game', $slugs);
    }

    public function test_invalid_query_parameters_return_validation_error(): void
    {
        $this->getJson('/api/games?per_page=51&sort=bogus')
            ->assertUnprocessable()
            ->assertJsonPath('code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['message', 'errors' => ['per_page', 'sort'], 'code']);
    }

    public function test_categories_and_tags_expose_counts(): void
    {
        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'action')
            ->assertJsonPath('data.0.game_count', 1);

        $this->getJson('/api/categories/action')->assertOk()->assertJsonPath('name', 'Action');
        $this->getJson('/api/tags')->assertOk()->assertJsonPath('data.0.game_count', 1);
    }

    public function test_inactive_categories_are_hidden(): void
    {
        Category::factory()->inactive()->create(['slug' => 'inactive']);

        $slugs = array_column($this->getJson('/api/categories?per_page=50')->json('data'), 'slug');
        self::assertNotContains('inactive', $slugs);
    }
}
