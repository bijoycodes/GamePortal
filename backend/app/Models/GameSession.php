<?php

namespace App\Models;

use App\Support\TokenGenerator;
use Database\Factories\GameSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameSession extends Model
{
    /** @use HasFactory<GameSessionFactory> */
    use HasFactory;

    protected $fillable = [
        'game_id',
        'user_id',
        'session_token',
        'started_at',
        'ended_at',
        'duration_seconds',
        'referrer',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_seconds' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $session): void {
            if (empty($session->session_token)) {
                $session->session_token = TokenGenerator::sessionToken();
            }

            if (empty($session->started_at)) {
                $session->started_at = now();
            }
        });
    }

    /** @return BelongsTo<Game, $this> */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<GameEvent> */
    public function events(): HasMany
    {
        return $this->hasMany(GameEvent::class, 'session_id');
    }
}
