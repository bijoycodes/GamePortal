<?php

namespace App\Console\Commands;

use App\Models\GameEvent;
use App\Models\GameSession;
use Illuminate\Console\Command;

final class AnalyticsPruneCommand extends Command
{
    protected $signature = 'analytics:prune';

    protected $description = 'Delete game events older than 12 months and sessions older than 24 months';

    public function handle(): int
    {
        $events = GameEvent::query()->where('occurred_at', '<', now()->subMonths(12))->delete();
        $sessions = GameSession::query()->where('started_at', '<', now()->subMonths(24))->delete();

        $this->info(sprintf('Pruned %d game events and %d game sessions.', $events, $sessions));

        return self::SUCCESS;
    }
}
