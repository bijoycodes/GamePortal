<?php

namespace App\Services;

use App\Models\Game;
use App\Models\GameFile;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class GameFileService
{
    public function normalizePath(string $path): ?string
    {
        if ($path === '' || str_contains($path, "\0") || str_contains($path, '\\')) {
            return null;
        }

        if (str_starts_with($path, '/') || preg_match('/^[A-Za-z]:/', $path) === 1) {
            return null;
        }

        $segments = [];
        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..' || strlen($segment) > 255) {
                return null;
            }

            $segments[] = $segment;
        }

        return $segments === [] ? null : implode('/', $segments);
    }

    public function resolve(Game $game, string $path): ?GameFile
    {
        $normalized = $this->normalizePath($path);
        if ($normalized === null) {
            return null;
        }

        return GameFile::query()
            ->where('game_id', $game->id)
            ->where('path', $normalized)
            ->first();
    }

    public function stream(Game $game, GameFile $file): StreamedResponse|Response|null
    {
        $key = sprintf('games/%s/files/%s', $game->uuid, $file->path);
        $disk = Storage::disk($file->disk);

        if (! $disk->exists($key)) {
            return null;
        }

        $stream = $disk->readStream($key);
        if ($stream === false) {
            return null;
        }

        $mime = $file->mime;
        if (str_starts_with($mime, 'text/html') && ! str_contains($mime, 'charset=')) {
            $mime .= '; charset=utf-8';
        }

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'public, max-age=3600, immutable',
        ]);
    }
}
