<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Game;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AdminGameLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('games');
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);
    }

    public function test_admin_can_create_update_and_soft_delete_games_with_audit_logs(): void
    {
        $category = Category::factory()->create();
        $tag = Tag::factory()->create();

        $created = $this->postJson('/api/admin/games', [
            'title' => 'Neon Runner',
            'slug' => 'neon-runner',
            'description' => 'A fast endless runner.',
            'category_id' => $category->id,
            'tag_ids' => [$tag->id],
            'orientation' => 'landscape',
            'settings' => ['requireFullscreen' => false, 'backgroundColor' => '#0f172a'],
        ]);

        $created->assertCreated()
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('entry_file', null)
            ->assertJsonStructure([
                'id', 'uuid', 'title', 'status', 'player_url', 'uploads', 'files', 'created_by', 'updated_by',
            ]);

        $game = Game::query()->where('slug', 'neon-runner')->firstOrFail();
        self::assertSame(GameStatus::Draft, $game->status);
        self::assertTrue($game->tags->contains($tag));
        self::assertSame(['requireFullscreen' => false, 'backgroundColor' => '#0f172a'], $game->settings);
        self::assertSame('game.created', AuditLog::query()->latest()->value('action'));

        $this->patchJson('/api/admin/games/'.$game->id, [
            'title' => 'Neon Runner II',
            'tag_ids' => [],
            'developer' => 'Studio Example',
        ])->assertOk()->assertJsonPath('title', 'Neon Runner II');

        self::assertSame(0, $game->tags()->count());
        self::assertSame('game.updated', AuditLog::query()->latest()->value('action'));

        $this->deleteJson('/api/admin/games/'.$game->id)->assertNoContent();
        self::assertNotNull($game->fresh()->deleted_at);
        self::assertSame(GameStatus::Disabled, $game->fresh()->status);
        self::assertSame('game.deleted', AuditLog::query()->latest()->value('action'));
    }

    public function test_slug_conflict_returns_409(): void
    {
        Game::factory()->create(['slug' => 'taken-slug']);

        $this->postJson('/api/admin/games', [
            'title' => 'Another Game',
            'slug' => 'taken-slug',
        ])->assertConflict()
            ->assertJsonPath('code', 'CONFLICT')
            ->assertJsonStructure(['errors' => ['slug']]);
    }

    public function test_invalid_settings_are_rejected(): void
    {
        $this->postJson('/api/admin/games', [
            'title' => 'Invalid Settings',
            'settings' => ['backgroundColor' => 'not-a-color'],
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['settings']]);
    }

    public function test_publish_and_disable_control_discovery_immediately(): void
    {
        $game = Game::factory()->draft()->create(['slug' => 'lifecycle-game']);

        $published = $this->postJson('/api/admin/games/'.$game->id.'/publish');
        $published->assertOk()
            ->assertJsonPath('status', 'published')
            ->assertJsonStructure(['published_at']);
        self::assertNotNull($published->json('published_at'));

        self::assertNotNull($game->fresh()->published_at);
        self::assertSame('game.published', AuditLog::query()->latest()->value('action'));

        $this->getJson('/api/games/lifecycle-game')->assertOk();

        $this->postJson('/api/admin/games/'.$game->id.'/disable')
            ->assertOk()
            ->assertJsonPath('status', 'disabled');
        $this->getJson('/api/games/lifecycle-game')->assertNotFound();
        self::assertSame('game.disabled', AuditLog::query()->latest()->value('action'));

        $this->postJson('/api/admin/games/'.$game->id.'/archive')
            ->assertOk()
            ->assertJsonPath('status', 'archived');
    }

    public function test_thumbnail_is_stored_and_exposed_as_a_signed_url(): void
    {
        $response = $this->postJson('/api/admin/games', [
            'title' => 'Thumb Game',
            'thumbnail' => UploadedFile::fake()->image('thumb.png', 640, 360),
        ]);

        $response->assertCreated();
        $game = Game::query()->where('slug', 'thumb-game')->firstOrFail();
        $this->postJson('/api/admin/games/'.$game->id.'/publish')->assertOk();

        self::assertStringStartsWith('games/'.$game->uuid.'/thumbnails/', $game->thumbnail_path);
        Storage::disk('games')->assertExists($game->thumbnail_path);

        $url = (string) $this->getJson('/api/games/thumb-game')->json('thumbnail_url');
        self::assertStringContainsString('/storage/games/', $url);
        self::assertStringContainsString('signature=', $url);

        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png');
    }

    public function test_admin_list_includes_all_statuses(): void
    {
        Game::factory()->create(['slug' => 'published-one']);
        Game::factory()->draft()->create(['slug' => 'draft-one']);

        $response = $this->getJson('/api/admin/games?status=draft');

        $response->assertOk()->assertJsonPath('meta.total', 1);
        self::assertSame('draft-one', $response->json('data.0.slug'));
    }
}
