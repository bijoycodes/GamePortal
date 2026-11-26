<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GameCatalogService;
use App\Services\GameFileService;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class GameHostController extends Controller
{
    public function __construct(
        private readonly GameCatalogService $catalog,
        private readonly GameFileService $files,
    ) {}

    public function index(string $slug): Response
    {
        $game = $this->catalog->publishedBySlug($slug);
        if ($game === null || ! $game->entry_file) {
            return $this->unavailable();
        }

        $entry = $this->files->resolve($game, $game->entry_file);
        if ($entry === null) {
            return $this->unavailable();
        }

        $segments = array_map('rawurlencode', explode('/', ltrim($game->entry_file, '/')));

        return redirect('/g/'.rawurlencode($game->slug).'/'.implode('/', $segments), 302)
            ->header('Cache-Control', 'no-cache, max-age=60');
    }

    public function file(string $slug, string $path): Response|StreamedResponse
    {
        $game = $this->catalog->publishedBySlug($slug);
        if ($game === null) {
            return $this->unavailable();
        }

        $file = $this->files->resolve($game, $path);
        if ($file === null) {
            return $this->unavailable();
        }

        return $this->files->stream($game, $file) ?? $this->unavailable();
    }

    private function unavailable(): Response
    {
        return response('Game unavailable', 404, ['Content-Type' => 'text/plain; charset=utf-8']);
    }
}
