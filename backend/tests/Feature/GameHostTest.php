<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureGameHost;
use App\Models\Game;
use App\Models\GameFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class GameHostTest extends TestCase
{
    use RefreshDatabase;

    private Game $game;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('games');
        $this->game = Game::factory()->create([
            'slug' => 'neon-runner',
            'entry_file' => 'index.html',
        ]);

        $this->addFile('index.html', '<html><body>Neon Runner</body></html>', 'text/html', true);
        $this->addFile('assets/main.js', 'console.log("ready");', 'application/javascript');
    }

    public function test_entry_route_redirects_to_index_with_expected_headers(): void
    {
        $response = $this->get('/g/neon-runner');

        $response->assertRedirect('/g/neon-runner/index.html')
            ->assertHeader('Content-Security-Policy')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()')
            ->assertHeaderMissing('Set-Cookie');

        self::assertStringContainsString('no-cache', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString('max-age=60', (string) $response->headers->get('Cache-Control'));
        self::assertStringContainsString(
            'frame-ancestors http://localhost:4300',
            (string) $response->headers->get('Content-Security-Policy'),
        );
    }

    public function test_indexed_game_file_is_streamed_with_sandbox_headers(): void
    {
        $response = $this->get('/g/neon-runner/index.html');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=utf-8')
            ->assertHeader('Content-Disposition', 'inline')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeaderMissing('Set-Cookie');

        $cacheControl = (string) $response->headers->get('Cache-Control');
        self::assertStringContainsString('public', $cacheControl);
        self::assertStringContainsString('max-age=3600', $cacheControl);
        self::assertStringContainsString('immutable', $cacheControl);

        self::assertSame(
            '<html><body>Neon Runner</body></html>',
            $response->streamedContent(),
        );
        self::assertStringContainsString(
            'frame-ancestors http://localhost:4300',
            (string) $response->headers->get('Content-Security-Policy'),
        );
    }

    public function test_nested_asset_is_streamed(): void
    {
        $this->get('/g/neon-runner/assets/main.js')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/javascript')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_traversal_and_unindexed_paths_return_plain_text_404(): void
    {
        foreach (['../index.html', '%2e%2e%2findex.html', 'assets/missing.js'] as $path) {
            $this->get('/g/neon-runner/'.$path)
                ->assertNotFound()
                ->assertSee('Game unavailable')
                ->assertHeader('Content-Type', 'text/plain; charset=utf-8');
        }
    }

    public function test_unpublished_game_is_not_hosted(): void
    {
        $this->game->update(['status' => 'disabled']);

        $this->get('/g/neon-runner')
            ->assertNotFound()
            ->assertSee('Game unavailable')
            ->assertHeader('Content-Type', 'text/plain; charset=utf-8');

        $this->get('/g/neon-runner/index.html')->assertNotFound();
    }

    public function test_storage_object_without_game_files_row_is_not_hosted(): void
    {
        Storage::disk('games')->put('games/'.$this->game->uuid.'/files/secret.txt', 'secret');

        $this->get('/g/neon-runner/secret.txt')->assertNotFound();
    }

    public function test_host_check_is_bypassed_in_testing_environment(): void
    {
        $this->withHeader('Host', 'evil.example.com')
            ->get('/g/neon-runner/index.html')
            ->assertOk();
    }

    public function test_host_check_rejects_wrong_host_outside_testing(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        try {
            $middleware = new EnsureGameHost;

            $rejected = $middleware->handle(
                Request::create('http://evil.example.com/g/neon-runner'),
                fn () => response('should not run'),
            );
            self::assertSame(404, $rejected->getStatusCode());
            self::assertSame('text/plain; charset=utf-8', $rejected->headers->get('Content-Type'));
            self::assertSame('Game unavailable', $rejected->getContent());

            $allowed = $middleware->handle(
                Request::create('http://127.0.0.1:8401/g/neon-runner'),
                fn () => response('allowed'),
            );
            self::assertSame(200, $allowed->getStatusCode());
            self::assertSame('allowed', $allowed->getContent());
        } finally {
            $this->app->detectEnvironment(fn (): string => 'testing');
        }
    }

    private function addFile(string $path, string $contents, string $mime, bool $entry = false): void
    {
        Storage::disk('games')->put('games/'.$this->game->uuid.'/files/'.$path, $contents);

        GameFile::create([
            'game_id' => $this->game->id,
            'path' => $path,
            'disk' => 'games',
            'mime' => $mime,
            'size' => strlen($contents),
            'sha256' => hash('sha256', $contents),
            'is_entry' => $entry,
        ]);
    }
}
