<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\GameSession;
use App\Support\TokenGenerator;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<GameSession> */
class GameSessionFactory extends Factory
{
    protected $model = GameSession::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'user_id' => null,
            'session_token' => TokenGenerator::sessionToken(),
            'started_at' => now(),
            'ended_at' => null,
            'duration_seconds' => 0,
            'referrer' => null,
        ];
    }
}
