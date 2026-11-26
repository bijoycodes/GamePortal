<?php

namespace App\Http\Controllers\Api;

use App\Enums\GameStatus;
use App\Http\ApiError;
use App\Http\Controllers\Controller;
use App\Http\Requests\AdminGameIndexRequest;
use App\Http\Requests\PaginationRequest;
use App\Http\Requests\StoreGameRequest;
use App\Http\Requests\UpdateGameRequest;
use App\Http\Requests\UploadGameRequest;
use App\Http\Resources\AdminGameResource;
use App\Http\Resources\GameUploadResource;
use App\Models\Game;
use App\Models\GameUpload;
use App\Services\AuditService;
use App\Services\GameCatalogService;
use App\Services\GameUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class AdminGameController extends Controller
{
    public function __construct(
        private readonly GameCatalogService $catalog,
        private readonly GameUploadService $uploads,
        private readonly AuditService $audit,
    ) {}

    public function index(AdminGameIndexRequest $request): AnonymousResourceCollection
    {
        return AdminGameResource::collection($this->catalog->adminList($request->validated()));
    }

    public function store(StoreGameRequest $request): JsonResponse
    {
        $data = $request->validated();
        unset($data['tag_ids'], $data['thumbnail']);
        $data['slug'] ??= Str::slug((string) $data['title']);
        $conflict = $this->slugConflict($data['slug']);
        if ($conflict !== null) {
            return $conflict;
        }

        $game = Game::create(array_merge($data, [
            'status' => GameStatus::Draft,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]));
        $game->tags()->sync($request->validated()['tag_ids'] ?? []);
        $this->storeThumbnail($game, $request->file('thumbnail'));

        $this->catalog->invalidate();
        $this->audit->record('game.created', Game::class, $game->id, ['title' => $game->title]);

        return (new AdminGameResource($this->reload($game)))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): AdminGameResource
    {
        return new AdminGameResource($this->catalog->adminById($id));
    }

    public function update(UpdateGameRequest $request, int $id): AdminGameResource|JsonResponse
    {
        $game = Game::findOrFail($id);
        $data = $request->validated();
        unset($data['tag_ids'], $data['thumbnail']);

        if (isset($data['slug'])) {
            $conflict = $this->slugConflict($data['slug'], $game->id);
            if ($conflict !== null) {
                return $conflict;
            }
        }

        $game->fill(array_merge($data, ['updated_by' => $request->user()?->id]));
        $game->save();

        if (array_key_exists('tag_ids', $request->validated())) {
            $game->tags()->sync($request->validated()['tag_ids'] ?? []);
        }
        $this->storeThumbnail($game, $request->file('thumbnail'));

        $this->catalog->invalidate();
        $this->audit->record('game.updated', Game::class, $game->id, ['fields' => array_keys($data)]);

        return new AdminGameResource($this->reload($game));
    }

    public function destroy(int $id): Response
    {
        $game = Game::findOrFail($id);
        $game->status = GameStatus::Disabled;
        $game->save();
        $game->delete();

        $this->catalog->invalidate();
        $this->audit->record('game.deleted', Game::class, $game->id, ['slug' => $game->slug]);

        return response()->noContent();
    }

    public function publish(int $id): AdminGameResource
    {
        return $this->transition($id, GameStatus::Published, 'game.published');
    }

    public function disable(int $id): AdminGameResource
    {
        return $this->transition($id, GameStatus::Disabled, 'game.disabled');
    }

    public function archive(int $id): AdminGameResource
    {
        return $this->transition($id, GameStatus::Archived, 'game.archived');
    }

    public function upload(UploadGameRequest $request, int $id): JsonResponse
    {
        $game = Game::findOrFail($id);
        $upload = $this->uploads->queue($game, $request->file('package'), $request->user());

        $this->audit->record('game.uploaded', Game::class, $game->id, [
            'upload_id' => $upload->id,
            'filename' => $upload->original_filename,
        ]);

        return response()->json([
            'message' => 'Upload queued for processing.',
            'data' => [
                'id' => $upload->id,
                'game_id' => $game->id,
                'status' => $upload->status?->value,
                'original_filename' => $upload->original_filename,
            ],
        ], 202);
    }

    public function uploads(PaginationRequest $request, int $id): AnonymousResourceCollection
    {
        $game = Game::findOrFail($id);

        return GameUploadResource::collection(
            $game->uploads()->orderByDesc('created_at')->paginate($request->perPage()),
        );
    }

    public function deleteUpload(int $uploadId): Response
    {
        $upload = GameUpload::findOrFail($uploadId);
        $gameId = $upload->game_id;
        $this->uploads->delete($upload);

        $this->audit->record('upload.deleted', GameUpload::class, $uploadId, ['game_id' => $gameId]);

        return response()->noContent();
    }

    private function transition(int $id, GameStatus $status, string $action): AdminGameResource
    {
        $game = Game::findOrFail($id);
        $game->status = $status;
        if ($status === GameStatus::Published) {
            $game->published_at = now();
        }
        $game->save();

        $this->catalog->invalidate();
        $this->audit->record($action, Game::class, $game->id, ['status' => $status->value]);

        return new AdminGameResource($this->reload($game));
    }

    private function slugConflict(string $slug, ?int $ignoreId = null): ?JsonResponse
    {
        $exists = Game::withTrashed()
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        return $exists
            ? ApiError::response('The slug has already been taken.', 409, 'CONFLICT', [
                'slug' => ['The slug has already been taken.'],
            ])
            : null;
    }

    private function storeThumbnail(Game $game, ?UploadedFile $thumbnail): void
    {
        if ($thumbnail === null) {
            return;
        }

        $extension = $thumbnail->guessExtension() ?: 'jpg';
        $path = sprintf('games/%s/thumbnails/%s.%s', $game->uuid, (string) Str::uuid(), $extension);
        $stream = fopen($thumbnail->getRealPath(), 'rb');
        if ($stream === false) {
            return;
        }

        try {
            Storage::disk('games')->writeStream($path, $stream);
            $oldPath = $game->thumbnail_path;
            $game->update(['thumbnail_path' => $path]);
            if (is_string($oldPath) && $oldPath !== '') {
                Storage::disk('games')->delete($oldPath);
            }
        } finally {
            fclose($stream);
        }
    }

    private function reload(Game $game): Game
    {
        return $this->catalog->adminById($game->id);
    }
}
