<?php

namespace App\Models;

use App\Enums\GameOrientation;
use App\Enums\GameSort;
use App\Enums\GameStatus;
use Database\Factories\GameFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Game extends Model
{
    /** @use HasFactory<GameFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'title',
        'slug',
        'description',
        'instructions',
        'category_id',
        'thumbnail_path',
        'status',
        'featured',
        'orientation',
        'width',
        'height',
        'entry_file',
        'version',
        'developer',
        'release_year',
        'license_name',
        'license_url',
        'attribution',
        'settings',
        'published_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => GameStatus::class,
            'orientation' => GameOrientation::class,
            'settings' => 'array',
            'featured' => 'boolean',
            'width' => 'integer',
            'height' => 'integer',
            'release_year' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $game): void {
            if (empty($game->uuid)) {
                $game->uuid = (string) Str::uuid();
            }
        });
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** @return BelongsToMany<Tag, $this> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'game_tag');
    }

    /** @return HasMany<GameFile> */
    public function files(): HasMany
    {
        return $this->hasMany(GameFile::class);
    }

    /** @return HasMany<GameUpload> */
    public function uploads(): HasMany
    {
        return $this->hasMany(GameUpload::class);
    }

    /** @return HasMany<GameSession> */
    public function sessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }

    /** @return HasMany<GameEvent> */
    public function events(): HasMany
    {
        return $this->hasMany(GameEvent::class);
    }

    /** @param Builder<Game> $query */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', GameStatus::Published);
    }

    /**
     * Apply documented discovery/admin filters.
     *
     * @param  Builder<Game>  $query
     * @param  array<string, mixed>  $filters
     */
    public function scopeWithFilters(Builder $query, array $filters): Builder
    {
        $search = $filters['q'] ?? null;
        if (is_string($search) && $search !== '') {
            $term = '%'.addcslashes($search, '%_\\').'%';
            $query->where(function (Builder $query) use ($term): void {
                $query->where('title', 'like', $term)
                    ->orWhere('description', 'like', $term)
                    ->orWhere('developer', 'like', $term);
            });
        }

        if (is_string($filters['category'] ?? null) && $filters['category'] !== '') {
            $query->whereHas('category', fn (Builder $query) => $query->where('slug', $filters['category']));
        }

        if (is_string($filters['tag'] ?? null) && $filters['tag'] !== '') {
            $query->whereHas('tags', fn (Builder $query) => $query->where('slug', $filters['tag']));
        }

        if (is_string($filters['status'] ?? null) && in_array($filters['status'], GameStatus::values(), true)) {
            $query->where('status', $filters['status']);
        }

        if (($filters['featured'] ?? false) === true) {
            $query->where('featured', true);
        }

        return $query;
    }

    /** @param Builder<Game> $query */
    public function scopeWithSort(Builder $query, string $sort): Builder
    {
        return match ($sort) {
            GameSort::Newest->value => $query->orderByDesc('published_at')->orderByDesc('id'),
            GameSort::Title->value => $query->orderBy('title')->orderBy('id'),
            default => $query->withCount('sessions')
                ->orderByDesc('sessions_count')
                ->orderByDesc('published_at')
                ->orderByDesc('id'),
        };
    }
}
