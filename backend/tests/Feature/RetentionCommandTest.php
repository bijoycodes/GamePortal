<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Game;
use App\Models\GameEvent;
use App\Models\GameSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

final class RetentionCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_analytics_prune_deletes_only_expired_rows(): void
    {
        $game = Game::factory()->create();

        $oldEvent = GameEvent::factory()->for($game)->create(['occurred_at' => now()->subMonths(13)]);
        $recentEvent = GameEvent::factory()->for($game)->create(['occurred_at' => now()->subDays(2)]);
        $oldSession = GameSession::factory()->for($game)->create(['started_at' => now()->subMonths(25)]);
        $recentSession = GameSession::factory()->for($game)->create(['started_at' => now()->subDays(2)]);

        $this->artisan('analytics:prune')
            ->expectsOutput('Pruned 1 game events and 1 game sessions.')
            ->assertExitCode(0);

        self::assertNull(GameEvent::find($oldEvent->id));
        self::assertNotNull(GameEvent::find($recentEvent->id));
        self::assertNull(GameSession::find($oldSession->id));
        self::assertNotNull(GameSession::find($recentSession->id));
    }

    public function test_audit_prune_deletes_only_expired_rows(): void
    {
        $old = AuditLog::factory()->create(['created_at' => now()->subMonths(25)]);
        $recent = AuditLog::factory()->create(['created_at' => now()->subDays(2)]);

        $this->artisan('audit:prune')
            ->expectsOutput('Pruned 1 audit log rows.')
            ->assertExitCode(0);

        self::assertNull(AuditLog::find($old->id));
        self::assertNotNull(AuditLog::find($recent->id));
    }

    public function test_cache_prune_removes_only_expired_catalogue_keys(): void
    {
        Cache::put('game-catalog:keys', [
            'game-catalog:expired' => now()->subMinute()->getTimestamp(),
            'game-catalog:fresh' => now()->addMinute()->getTimestamp(),
        ], now()->addDay());
        Cache::put('game-catalog:expired', 'expired');
        Cache::put('game-catalog:fresh', 'fresh');

        $this->artisan('cache:prune-game-lists')
            ->expectsOutput('Pruned 1 stale game catalogue cache keys.')
            ->assertExitCode(0);

        self::assertNull(Cache::get('game-catalog:expired'));
        self::assertSame('fresh', Cache::get('game-catalog:fresh'));
        self::assertSame(['game-catalog:fresh'], array_keys(Cache::get('game-catalog:keys', [])));
    }
}
