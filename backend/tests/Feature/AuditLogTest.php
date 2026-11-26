<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Game;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_read_paginated_audit_logs(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);

        $game = Game::factory()->create();
        $old = AuditLog::factory()->create([
            'action' => 'game.created',
            'subject_type' => Game::class,
            'subject_id' => $game->id,
            'created_at' => now()->subDay(),
        ]);
        $new = AuditLog::factory()->create([
            'action' => 'game.updated',
            'subject_type' => Game::class,
            'subject_id' => $game->id,
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/admin/audit-logs?per_page=10&page=1');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id', 'user_id', 'action', 'subject_type', 'subject_id',
                    'metadata', 'ip', 'user_agent', 'created_at',
                ]],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'from', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', $new->id)
            ->assertJsonPath('data.1.id', $old->id);
    }

    public function test_audit_service_records_actor_request_context_and_redacts_secrets(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['*']);

        $game = Game::factory()->create();
        $log = app(AuditService::class)->record(
            'game.published',
            Game::class,
            $game->id,
            [
                'token' => 'secret-token',
                'title' => 'Neon Runner',
                'nested' => ['api_key' => 'secret-key', 'level' => 3],
            ],
        );

        self::assertSame($admin->id, $log->user_id);
        self::assertSame('game.published', $log->action);
        self::assertSame(Game::class, $log->subject_type);
        self::assertSame($game->id, $log->subject_id);
        self::assertSame('127.0.0.1', $log->ip);
        self::assertSame([
            'token' => '[redacted]',
            'title' => 'Neon Runner',
            'nested' => ['api_key' => '[redacted]', 'level' => 3],
        ], $log->metadata);
    }

    public function test_non_admin_cannot_read_audit_logs(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson('/api/admin/audit-logs')->assertForbidden();
    }
}
