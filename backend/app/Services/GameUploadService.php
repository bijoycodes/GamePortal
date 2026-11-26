<?php

namespace App\Services;

use App\Enums\UploadStatus;
use App\Jobs\ProcessGameUpload;
use App\Models\Game;
use App\Models\GameFile;
use App\Models\GameUpload;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class GameUploadService
{
    public function queue(Game $game, UploadedFile $file, ?User $uploader): GameUpload
    {
        $upload = DB::transaction(function () use ($game, $file, $uploader): GameUpload {
            $upload = GameUpload::create([
                'game_id' => $game->id,
                'uploader_id' => $uploader?->id,
                'original_filename' => $file->getClientOriginalName(),
                'raw_path' => '',
                'disk' => 'games',
                'status' => UploadStatus::Pending,
            ]);

            $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $safeName = Str::slug($baseName) ?: 'game';
            $rawPath = sprintf('games/%s/raw/%d-%s.zip', $game->uuid, $upload->id, $safeName);

            $stream = fopen($file->getRealPath(), 'rb');
            if ($stream === false) {
                throw new \RuntimeException('Unable to read the uploaded package.');
            }

            try {
                Storage::disk('games')->writeStream($rawPath, $stream);
            } finally {
                fclose($stream);
            }

            $upload->update(['raw_path' => $rawPath]);

            return $upload;
        });

        ProcessGameUpload::dispatch($upload->id);

        return $upload;
    }

    public function delete(GameUpload $upload): void
    {
        DB::transaction(function () use ($upload): void {
            GameFile::query()->where('upload_id', $upload->id)->delete();
            Storage::disk($upload->disk)->delete($upload->raw_path);
            $upload->delete();
        });
    }
}
