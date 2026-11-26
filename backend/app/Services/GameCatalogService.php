<?php

namespace App\Services;

use App\Enums\GameSort;
use App\Enums\GameStatus;
use App\Models\Game;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

final class GameCatalogService
{
    private const CACHE_TTL = 60;

    private const KEY_REGISTRY = 'game-catalog:keys';

    /** @param array<string, mixed> $filters */
    public function discover(array $filters): LengthAwarePaginator
    {
        $filters = $this->normalize($filters);
        $key = 'game-catalog:list:'.hash('sha256', (string) json_encode($filters));
        $this->rememberKey($key);

        return Cache::remember($key, self::CACHE_TTL, fn (): LengthAwarePaginator => Game::query()
            ->published()
            ->with(['category', 'tags'])
            ->withFilters($filters)
            ->withSort($filters['sort'])
            ->paginate($filters['per_page'])
            ->withQueryString());
    }

    /** @param array<string, mixed> $filters */
    public function adminList(array $filters): LengthAwarePaginator
    {
        $filters = $this->normalize($filters);

        return Game::query()
            ->with(['category', 'tags', 'uploads', 'files'])
            ->withFilters($filters)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($filters['per_page'])
            ->withQueryString();
    }

    public function publishedBySlug(string $slug): ?Game
    {
        return Game::query()
            ->published()
            ->where('slug', $slug)
            ->with(['category', 'tags'])
            ->first();
    }

    public function adminById(int $id): Game
    {
        return Game::query()
            ->with(['category', 'tags', 'uploads', 'files'])
            ->findOrFail($id);
    }

    public function invalidate(): void
    {
        /** @var array<string, int> $keys */
        $keys = Cache::get(self::KEY_REGISTRY, []);
        foreach (array_keys($keys) as $key) {
            Cache::forget((string) $key);
        }

        Cache::forget(self::KEY_REGISTRY);
    }

    public function pruneStaleLists(): int
    {
        /** @var array<string, int> $keys */
        $keys = Cache::get(self::KEY_REGISTRY, []);
        $pruned = 0;

        foreach ($keys as $key => $expiresAt) {
            if ($expiresAt <= now()->getTimestamp()) {
                Cache::forget((string) $key);
                unset($keys[$key]);
                $pruned++;
            }
        }

        Cache::put(self::KEY_REGISTRY, $keys, now()->addDay());

        return $pruned;
    }

    private function rememberKey(string $key): void
    {
        /** @var array<string, int> $keys */
        $keys = Cache::get(self::KEY_REGISTRY, []);
        $keys[$key] = now()->addSeconds(self::CACHE_TTL)->getTimestamp();
        Cache::put(self::KEY_REGISTRY, $keys, now()->addDay());
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function normalize(array $filters): array
    {
        $q = $filters['q'] ?? null;
        $sort = $filters['sort'] ?? GameSort::Popular->value;
        if (! in_array($sort, GameSort::values(), true)) {
            $sort = GameSort::Popular->value;
        }

        $status = $filters['status'] ?? null;
        if (! is_string($status) || ! in_array($status, GameStatus::values(), true)) {
            $status = null;
        }

        return [
            'q' => is_string($q) ? mb_substr($q, 0, 120) : null,
            'category' => is_string($filters['category'] ?? null) ? $filters['category'] : null,
            'tag' => is_string($filters['tag'] ?? null) ? $filters['tag'] : null,
            'status' => $status,
            'sort' => $sort,
            'per_page' => max(1, min(50, (int) ($filters['per_page'] ?? 12))),
            'page' => max(1, (int) ($filters['page'] ?? 1)),
        ];
    }
}
