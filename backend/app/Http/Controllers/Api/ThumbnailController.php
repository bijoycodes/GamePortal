<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ThumbnailController extends Controller
{
    private const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    public function __invoke(string $path, Request $request): Response|StreamedResponse
    {
        if (preg_match('#^games/[0-9a-fA-F-]{36}/thumbnails/[^/]+$#', $path) !== 1
            || ! Game::query()->where('thumbnail_path', $path)->exists()) {
            return response('Not found', 404, ['Content-Type' => 'text/plain; charset=utf-8']);
        }

        $disk = Storage::disk('games');
        if (! $disk->exists($path)) {
            return response('Not found', 404, ['Content-Type' => 'text/plain; charset=utf-8']);
        }

        $mime = (string) $disk->mimeType($path);
        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            return response('Not found', 404, ['Content-Type' => 'text/plain; charset=utf-8']);
        }

        $stream = $disk->readStream($path);
        if ($stream === false) {
            return response('Not found', 404, ['Content-Type' => 'text/plain; charset=utf-8']);
        }

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=1800',
        ]);
    }
}
