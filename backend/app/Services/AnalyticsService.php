<?php

namespace App\Services;

use App\Enums\EventType;
use App\Models\Game;
use App\Models\GameEvent;
use App\Models\GameSession;
use App\Models\User;
use App\Support\Referrer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class AnalyticsService
{
    public function startSession(Game $game, ?string $referrer, ?User $user): GameSession
    {
        return GameSession::create([
            'game_id' => $game->id,
            'user_id' => $user?->id,
            'session_token' => null,
            'started_at' => now(),
            'referrer' => Referrer::sanitize($referrer),
        ]);
    }

    public function endSession(GameSession $session, int $durationSeconds, Carbon $endedAt): GameSession
    {
        $session->update([
            'ended_at' => $endedAt,
            'duration_seconds' => $durationSeconds,
        ]);

        return $session->refresh();
    }

    public function recordEvent(
        GameSession $session,
        EventType $type,
        array $metadata,
        Carbon $occurredAt,
    ): GameEvent {
        return GameEvent::create([
            'game_id' => $session->game_id,
            'session_id' => $session->id,
            'type' => $type,
            'metadata' => $metadata,
            'occurred_at' => $occurredAt,
            'created_at' => now(),
        ]);
    }

    /** @return array<string, mixed> */
    public function overview(int $days): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $sessions = GameSession::query()->where('started_at', '>=', $from);

        return [
            'plays' => (int) (clone $sessions)->count(),
            'unique_players' => (int) (clone $sessions)
                ->select(DB::raw('COUNT(DISTINCT COALESCE(CAST(user_id AS TEXT), session_token)) as total'))
                ->value('total'),
            'sessions' => (int) (clone $sessions)->count(),
            'avg_duration_seconds' => round((float) (clone $sessions)
                ->whereNotNull('ended_at')
                ->avg('duration_seconds'), 1),
            'timeseries' => $this->timeseries(clone $sessions, $days, $from),
            'top_games' => $this->topGames($from),
        ];
    }

    /** @return array<string, mixed> */
    public function gameOverview(Game $game, int $days): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $sessions = GameSession::query()
            ->where('game_id', $game->id)
            ->where('started_at', '>=', $from);

        return [
            'game' => ['id' => $game->id, 'title' => $game->title, 'slug' => $game->slug],
            'plays' => (int) (clone $sessions)->count(),
            'unique_players' => (int) (clone $sessions)
                ->select(DB::raw('COUNT(DISTINCT COALESCE(CAST(user_id AS TEXT), session_token)) as total'))
                ->value('total'),
            'sessions' => (int) (clone $sessions)->count(),
            'avg_duration_seconds' => round((float) (clone $sessions)
                ->whereNotNull('ended_at')
                ->avg('duration_seconds'), 1),
            'events' => (int) GameEvent::query()
                ->where('game_id', $game->id)
                ->where('occurred_at', '>=', $from)
                ->count(),
            'timeseries' => $this->timeseries(clone $sessions, $days, $from),
        ];
    }

    /**
     * @param  Builder<GameSession>  $sessions
     * @return list<array{date: string, plays: int}>
     */
    private function timeseries($sessions, int $days, Carbon $from): array
    {
        $counts = $sessions->select('started_at')->get()
            ->groupBy(fn (GameSession $session): string => $session->started_at->toDateString())
            ->map(fn ($group): int => $group->count());

        $series = [];
        for ($day = 0; $day < $days; $day++) {
            $date = $from->copy()->addDays($day)->toDateString();
            $series[] = ['date' => $date, 'plays' => (int) ($counts[$date] ?? 0)];
        }

        return $series;
    }

    /** @return list<array{id: int, title: string, plays: int}> */
    private function topGames(Carbon $from): array
    {
        return Game::query()
            ->withCount(['sessions' => fn ($query) => $query->where('started_at', '>=', $from)])
            ->orderByDesc('sessions_count')
            ->orderBy('title')
            ->limit(5)
            ->get()
            ->map(fn (Game $game): array => [
                'id' => $game->id,
                'title' => $game->title,
                'plays' => (int) $game->sessions_count,
            ])
            ->all();
    }
}
