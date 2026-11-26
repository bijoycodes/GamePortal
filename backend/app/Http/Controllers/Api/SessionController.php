<?php

namespace App\Http\Controllers\Api;

use App\Enums\EventType;
use App\Http\Controllers\Controller;
use App\Http\Requests\CreateSessionRequest;
use App\Http\Requests\EndSessionRequest;
use App\Http\Requests\StoreEventRequest;
use App\Models\Game;
use App\Models\GameSession;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

final class SessionController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics) {}

    public function create(string $slug, CreateSessionRequest $request): JsonResponse
    {
        $game = Game::query()->published()->where('slug', $slug)->firstOrFail();
        $session = $this->analytics->startSession(
            $game,
            $request->input('referrer'),
            $request->user(),
        );

        return response()->json([
            'id' => $session->id,
            'session_token' => $session->session_token,
            'started_at' => $session->started_at?->toJSON(),
        ], 201);
    }

    public function end(string $session_token, EndSessionRequest $request): JsonResponse
    {
        $session = GameSession::query()->where('session_token', $session_token)->firstOrFail();
        $endedAt = Carbon::parse((string) $request->input('ended_at'));

        if ($endedAt->lt($session->started_at)) {
            throw ValidationException::withMessages([
                'ended_at' => ['The ended_at field must be after the session start time.'],
            ]);
        }

        $session = $this->analytics->endSession(
            $session,
            (int) $request->input('duration_seconds'),
            $endedAt,
        );

        return response()->json([
            'id' => $session->id,
            'session_token' => $session->session_token,
            'started_at' => $session->started_at?->toJSON(),
            'ended_at' => $session->ended_at?->toJSON(),
            'duration_seconds' => $session->duration_seconds,
        ]);
    }

    public function event(string $session_token, StoreEventRequest $request): JsonResponse
    {
        $session = GameSession::query()->where('session_token', $session_token)->firstOrFail();
        $validated = $request->validated();

        $event = $this->analytics->recordEvent(
            $session,
            EventType::from((string) $validated['type']),
            is_array($validated['metadata'] ?? null) ? $validated['metadata'] : [],
            Carbon::parse((string) $validated['occurred_at']),
        );

        return response()->json([
            'id' => $event->id,
            'type' => $event->type?->value,
            'occurred_at' => $event->occurred_at?->toJSON(),
        ], 201);
    }
}
