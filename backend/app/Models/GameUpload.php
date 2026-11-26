<?php

namespace App\Models;

use App\Enums\UploadStatus;
use Database\Factories\GameUploadFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameUpload extends Model
{
    /** @use HasFactory<GameUploadFactory> */
    use HasFactory;

    protected $fillable = [
        'game_id',
        'uploader_id',
        'original_filename',
        'raw_path',
        'disk',
        'status',
        'error_message',
        'file_count',
        'total_size',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => UploadStatus::class,
            'file_count' => 'integer',
            'total_size' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Game, $this> */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<GameFile> */
    public function files(): HasMany
    {
        return $this->hasMany(GameFile::class, 'upload_id');
    }
}
