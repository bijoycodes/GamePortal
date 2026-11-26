<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GameIndexRequest;
use App\Http\Resources\GameResource;
use App\Services\GameCatalogService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class GameController extends Controller
{
    public function __construct(private readonly GameCatalogService $catalog) {}

    public function index(GameIndexRequest $request): AnonymousResourceCollection
    {
        return GameResource::collection($this->catalog->discover($request->validated()));
    }

    public function show(string $slug): GameResource
    {
        $game = $this->catalog->publishedBySlug($slug);
        if ($game === null) {
            throw new NotFoundHttpException('Game not found.');
        }

        return new GameResource($game);
    }
}
