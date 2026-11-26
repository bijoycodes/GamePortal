<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticsRequest;
use App\Models\Game;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;

final class AdminAnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics) {}

    public function overview(AnalyticsRequest $request): JsonResponse
    {
        return response()->json($this->analytics->overview($request->days()));
    }

    public function game(AnalyticsRequest $request, int $id): JsonResponse
    {
        return response()->json($this->analytics->gameOverview(Game::findOrFail($id), $request->days()));
    }
}
