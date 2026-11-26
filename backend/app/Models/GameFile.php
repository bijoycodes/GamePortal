<?php

namespace App\Models;

use Database\Factories\GameFileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameFile extends Model
{
    /** @use HasFactory<GameFileFactory> */
    use HasFactory;

    protected $fillable = [
        'game_id',
        'upload_id',
        'path',
        'disk',
        'mime',
        'size',
        'sha256',
        'is_entry',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'is_entry' => 'boolean',
        ];
    }

    /** @return BelongsTo<Game, $this> */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /** @return BelongsTo<GameUpload, $this> */
    public function upload(): BelongsTo
    {
        return $this->belongsTo(GameUpload::class, 'upload_id');
    }

    public function storageKey(): string
    {
        return sprintf('games/%s/files/%s', $this->game->uuid, $this->path);
    }
}
