<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AuditLog> */
class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => 'game.updated',
            'subject_type' => Game::class,
            'subject_id' => fake()->numberBetween(1, 100),
            'metadata' => [],
            'ip' => '127.0.0.1',
            'user_agent' => 'GamePortal test',
            'created_at' => now(),
        ];
    }
}
