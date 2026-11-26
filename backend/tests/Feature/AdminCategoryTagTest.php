<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Game;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AdminCategoryTagTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);
    }

    public function test_category_crud_and_conflict_on_delete_with_games(): void
    {
        $created = $this->postJson('/api/admin/categories', [
            'name' => 'Adventure',
            'description' => 'Explore worlds',
            'sort_order' => 5,
        ]);
        $created->assertCreated()->assertJsonPath('slug', 'adventure');

        $category = Category::query()->where('slug', 'adventure')->firstOrFail();
        self::assertSame('category.created', AuditLog::query()->latest()->value('action'));

        $this->patchJson('/api/admin/categories/'.$category->id, ['name' => 'Adventure Games'])
            ->assertOk()
            ->assertJsonPath('name', 'Adventure Games');

        Game::factory()->create(['category_id' => $category->id]);
        $this->deleteJson('/api/admin/categories/'.$category->id)
            ->assertConflict()
            ->assertJsonPath('code', 'CONFLICT');

        Game::query()->where('category_id', $category->id)->delete();
        $this->deleteJson('/api/admin/categories/'.$category->id)->assertNoContent();
        self::assertSame('category.deleted', AuditLog::query()->latest()->value('action'));
    }

    public function test_tag_crud_detaches_games_before_delete(): void
    {
        $created = $this->postJson('/api/admin/tags', ['name' => 'puzzle']);
        $created->assertCreated()->assertJsonPath('slug', 'puzzle');

        $tag = Tag::query()->where('slug', 'puzzle')->firstOrFail();
        $game = Game::factory()->create();
        $game->tags()->attach($tag);

        $this->patchJson('/api/admin/tags/'.$tag->id, ['name' => 'brain-teaser'])
            ->assertOk()
            ->assertJsonPath('slug', 'puzzle');

        $this->deleteJson('/api/admin/tags/'.$tag->id)->assertNoContent();
        self::assertSame(0, $game->tags()->count());
        self::assertNull(Tag::query()->find($tag->id));
        self::assertSame('tag.deleted', AuditLog::query()->latest()->value('action'));
    }
}
