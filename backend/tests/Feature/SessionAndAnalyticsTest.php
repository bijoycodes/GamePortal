<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\GameEvent;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class SessionAndAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private Game $game;

    protected function setUp(): void
    {
        parent::setUp();

        $this->game = Game::factory()->create(['slug' => 'neon-runner']);
    }

    public function test_session_lifecycle_and_event_ingestion(): void
    {
        $created = $this->postJson('/api/games/neon-runner/sessions', [
            'referrer' => 'https://user:pass@example.com:443/path?x=1',
        ])->assertCreated()
            ->assertJsonStructure(['id', 'session_token', 'started_at']);

        $token = (string) $created->json('session_token');
        self::assertMatchesRegularExpression('/^[A-Za-z0-9_-]{64}$/', $token);

        $session = GameSession::query()->where('session_token', $token)->firstOrFail();
        self::assertSame('example.com', $session->referrer);

        $endedAt = now()->addSeconds(90);
        $this->patchJson('/api/sessions/'.$token, [
            'duration_seconds' => 90,
            'ended_at' => $endedAt->toJSON(),
        ])->assertOk()
            ->assertJsonPath('duration_seconds', 90)
            ->assertJsonStructure(['id', 'session_token', 'started_at', 'ended_at', 'duration_seconds']);

        $occurredAt = now()->addSeconds(30)->toJSON();
        $this->postJson('/api/sessions/'.$token.'/events', [
            'type' => 'score',
            'metadata' => ['score' => 1250],
            'occurred_at' => $occurredAt,
        ])->assertCreated()
            ->assertJsonStructure(['id', 'type', 'occurred_at'])
            ->assertJsonPath('type', 'score');

        $event = GameEvent::query()->where('session_id', $session->id)->firstOrFail();
        self::assertSame(['score' => 1250], $event->metadata);
        self::assertSame($session->id, $event->session_id);
    }

    public function test_event_validation_enforces_type_timestamp_and_metadata_limits(): void
    {
        $session = GameSession::factory()->for($this->game)->create();
        $url = '/api/sessions/'.$session->session_token.'/events';

        $this->postJson($url, [
            'type' => 'bogus',
            'occurred_at' => now()->toJSON(),
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['type']]);

        $this->postJson($url, [
            'type' => 'score',
            'occurred_at' => now()->subHour()->toJSON(),
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['occurred_at']]);

        $this->postJson($url, [
            'type' => 'score',
            'metadata' => ['blob' => str_repeat('x', 9000)],
            'occurred_at' => now()->toJSON(),
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['metadata']]);

        $this->postJson($url, [
            'type' => 'score',
            'metadata' => ['a' => ['b' => ['c' => ['d' => ['e' => 1]]]]],
            'occurred_at' => now()->toJSON(),
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['metadata']]);

        self::assertSame(0, GameEvent::query()->count());
    }

    public function test_session_end_validation_rejects_old_and_earlier_timestamps(): void
    {
        $session = GameSession::factory()->for($this->game)->create();
        $url = '/api/sessions/'.$session->session_token;

        $this->patchJson($url, [
            'duration_seconds' => 10,
            'ended_at' => now()->subHour()->toJSON(),
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['ended_at']]);

        $this->patchJson($url, [
            'duration_seconds' => 10,
            'ended_at' => Carbon::parse($session->started_at)->subMinute()->toJSON(),
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['ended_at']]);
    }

    public function test_unknown_session_token_returns_not_found(): void
    {
        $token = str_repeat('a', 64);

        $this->patchJson('/api/sessions/'.$token, [
            'duration_seconds' => 1,
            'ended_at' => now()->toJSON(),
        ])->assertNotFound()->assertJsonPath('code', 'NOT_FOUND');

        $this->postJson('/api/sessions/'.$token.'/events', [
            'type' => 'custom',
            'occurred_at' => now()->toJSON(),
        ])->assertNotFound();
    }

    public function test_events_are_rate_limited_per_session(): void
    {
        $session = GameSession::factory()->for($this->game)->create();
        $url = '/api/sessions/'.$session->session_token.'/events';

        for ($i = 0; $i < 60; $i++) {
            $this->postJson($url, [
                'type' => 'custom',
                'occurred_at' => now()->toJSON(),
            ])->assertCreated();
        }

        $this->postJson($url, [
            'type' => 'custom',
            'occurred_at' => now()->toJSON(),
        ])->assertStatus(429)->assertJsonPath('code', 'RATE_LIMITED');
    }

    public function test_admin_analytics_overview_and_game_metrics(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);

        $first = GameSession::factory()->for($this->game)->create([
            'started_at' => now()->subDay(),
            'ended_at' => now()->subDay()->addSeconds(120),
            'duration_seconds' => 120,
        ]);
        GameSession::factory()->for($this->game)->create([
            'started_at' => now()->subDays(2),
            'ended_at' => now()->subDays(2)->addSeconds(60),
            'duration_seconds' => 60,
        ]);
        GameEvent::factory()->for($this->game)->for($first, 'session')->create([
            'type' => 'score',
            'occurred_at' => now()->subDay(),
        ]);

        $this->getJson('/api/admin/analytics/overview?days=7')
            ->assertOk()
            ->assertJsonPath('plays', 2)
            ->assertJsonPath('sessions', 2)
            ->assertJsonPath('unique_players', 2)
            ->assertJsonPath('avg_duration_seconds', 90)
            ->assertJsonStructure([
                'plays', 'unique_players', 'sessions', 'avg_duration_seconds',
                'timeseries' => [['date', 'plays']],
                'top_games' => [['id', 'title', 'plays']],
            ]);

        $response = $this->getJson('/api/admin/analytics/overview?days=7');
        self::assertCount(7, $response->json('timeseries'));
        self::assertSame($this->game->id, $response->json('top_games.0.id'));

        $this->getJson('/api/admin/analytics/games/'.$this->game->id.'?days=7')
            ->assertOk()
            ->assertJsonPath('game.id', $this->game->id)
            ->assertJsonPath('plays', 2)
            ->assertJsonPath('events', 1)
            ->assertJsonStructure([
                'game' => ['id', 'title', 'slug'],
                'plays', 'unique_players', 'sessions', 'avg_duration_seconds', 'events',
                'timeseries' => [['date', 'plays']],
            ]);
    }

    public function test_invalid_days_parameter_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);

        $this->getJson('/api/admin/analytics/overview?days=0')
            ->assertUnprocessable()
            ->assertJsonPath('code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['errors' => ['days']]);
    }
}
