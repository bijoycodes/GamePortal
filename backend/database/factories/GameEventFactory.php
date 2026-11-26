<?php

namespace Database\Factories;

use App\Enums\EventType;
use App\Models\Game;
use App\Models\GameEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<GameEvent> */
class GameEventFactory extends Factory
{
    protected $model = GameEvent::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'session_id' => null,
            'type' => EventType::Custom,
            'metadata' => [],
            'occurred_at' => now(),
            'created_at' => now(),
        ];
    }
}
