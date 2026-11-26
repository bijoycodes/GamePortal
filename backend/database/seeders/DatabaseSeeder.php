<?php

namespace Database\Seeders;

use App\Enums\GameStatus;
use App\Enums\UploadStatus;
use App\Models\Category;
use App\Models\Game;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            return;
        }

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@gameportal.test'],
            [
                'name' => 'Local Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
        );

        $action = Category::query()->firstOrCreate(
            ['slug' => 'action'],
            ['name' => 'Action', 'description' => 'Fast-paced games', 'sort_order' => 1],
        );
        $puzzle = Category::query()->firstOrCreate(
            ['slug' => 'puzzle'],
            ['name' => 'Puzzle', 'description' => 'Think before you click', 'sort_order' => 2],
        );

        $arcade = Tag::query()->firstOrCreate(['slug' => 'arcade'], ['name' => 'arcade']);
        $retro = Tag::query()->firstOrCreate(['slug' => 'retro'], ['name' => 'retro']);
        $brain = Tag::query()->firstOrCreate(['slug' => 'brain'], ['name' => 'brain']);

        $demoGames = [
            [
                'title' => 'Neon Runner',
                'slug' => 'neon-runner',
                'category_id' => $action->id,
                'status' => GameStatus::Published,
                'featured' => true,
                'tags' => [$arcade->id],
            ],
            [
                'title' => 'Tile puzzler',
                'slug' => 'tile-puzzler',
                'category_id' => $puzzle->id,
                'status' => GameStatus::Published,
                'featured' => false,
                'tags' => [$brain->id],
            ],
            [
                'title' => 'Retro Invaders',
                'slug' => 'retro-invaders',
                'category_id' => $action->id,
                'status' => GameStatus::Draft,
                'featured' => false,
                'tags' => [$retro->id, $arcade->id],
            ],
        ];

        foreach ($demoGames as $demo) {
            $tags = $demo['tags'];
            unset($demo['tags']);

            $game = Game::query()->firstOrCreate(
                ['slug' => $demo['slug']],
                array_merge($demo, [
                    'description' => 'Playable demo game for local development.',
                    'instructions' => 'Click or tap the moving target to score points.',
                    'entry_file' => 'index.html',
                    'orientation' => 'any',
                    'width' => 960,
                    'height' => 600,
                    'version' => '1.0.0',
                    'developer' => 'GamePortal Demo',
                    'settings' => [],
                    'published_at' => $demo['status'] === GameStatus::Published ? now() : null,
                    'created_by' => $admin->id,
                    'updated_by' => $admin->id,
                ]),
            );
            $game->tags()->sync($tags);
            $this->seedPlayableFiles($game, $admin);
        }
    }

    /**
     * Write a small self-contained HTML5 game to the games disk and index its files.
     * This gives local installs something playable without requiring an admin upload first.
     */
    private function seedPlayableFiles(Game $game, User $admin): void
    {
        if ($game->files()->exists()) {
            return;
        }

        $disk = Storage::disk('games');
        $prefix = sprintf('games/%s/files', $game->uuid);

        $upload = $game->uploads()->create([
            'uploader_id' => $admin->id,
            'original_filename' => sprintf('%s-demo.zip', $game->slug),
            'raw_path' => sprintf('games/%s/raw/%s-demo.zip', $game->uuid, $game->slug),
            'disk' => 'games',
            'status' => UploadStatus::Published,
            'file_count' => 3,
            'total_size' => 0,
            'processed_at' => now(),
        ]);

        $files = [
            'index.html' => ['mime' => 'text/html', 'content' => $this->demoHtml($game->title)],
            'styles.css' => ['mime' => 'text/css', 'content' => $this->demoCss()],
            'game.js' => ['mime' => 'application/javascript', 'content' => $this->demoJavaScript()],
        ];

        $totalSize = 0;

        foreach ($files as $path => $file) {
            $content = $file['content'];
            $disk->put(sprintf('%s/%s', $prefix, $path), $content, 'private');
            $totalSize += strlen($content);

            $game->files()->create([
                'upload_id' => $upload->id,
                'path' => $path,
                'disk' => 'games',
                'mime' => $file['mime'],
                'size' => strlen($content),
                'sha256' => hash('sha256', $content),
                'is_entry' => $path === 'index.html',
            ]);
        }

        $upload->update(['total_size' => $totalSize]);
        $game->update(['entry_file' => 'index.html']);
    }

    private function demoHtml(string $title): string
    {
        return str_replace('%%TITLE%%', $title, <<<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>%%TITLE%%</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="shell">
    <header>
      <span class="eyebrow">GamePortal demo</span>
      <h1>%%TITLE%%</h1>
    </header>
    <div id="board" class="board">
      <button id="target" type="button" aria-label="Tap the moving target"></button>
    </div>
    <footer>
      <p class="score">Score <strong id="score">0</strong></p>
      <p class="hint">Click or tap the moving target. Every hit scores a point.</p>
    </footer>
  </main>
  <script src="game.js"></script>
</body>
</html>
HTML);
    }

    private function demoCss(): string
    {
        return <<<'CSS'
:root { color-scheme: dark; font-family: system-ui, -apple-system, sans-serif; }
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 20%, #1e3a8a 0, #0f172a 55%, #020617 100%);
  color: #e2e8f0;
}
.shell { width: min(960px, 94vw); padding: 1.5rem; }
header { text-align: center; margin-bottom: 1rem; }
h1 { margin: 0.25rem 0 0; font-size: clamp(1.5rem, 4vw, 2.5rem); }
.eyebrow { color: #7dd3fc; font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; }
.board {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 62vh;
  overflow: hidden;
  border: 1px solid #38bdf855;
  border-radius: 1rem;
  background: linear-gradient(145deg, #0b1220, #111c33);
  box-shadow: 0 24px 60px #0008;
}
#target {
  position: absolute;
  top: 0;
  left: 0;
  width: 72px;
  height: 72px;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #bae6fd, #38bdf8 55%, #0284c7);
  box-shadow: 0 0 32px #38bdf899;
  cursor: pointer;
  transition: transform 120ms ease-out;
}
#target:focus-visible { outline: 3px solid #fbbf24; outline-offset: 4px; }
footer { text-align: center; margin-top: 1rem; }
.score { font-size: 1.25rem; margin: 0; }
.score strong { color: #7dd3fc; font-variant-numeric: tabular-nums; }
.hint { color: #94a3b8; font-size: 0.875rem; }
CSS;
    }

    private function demoJavaScript(): string
    {
        return <<<'JS'
(() => {
  const board = document.getElementById('board');
  const target = document.getElementById('target');
  const output = document.getElementById('score');
  let score = 0;

  function move() {
    const maxX = Math.max(0, board.clientWidth - target.offsetWidth);
    const maxY = Math.max(0, board.clientHeight - target.offsetHeight);
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    target.style.transform = `translate(${x}px, ${y}px)`;
  }

  target.addEventListener('click', () => {
    score += 1;
    output.textContent = String(score);
    parent.postMessage({ source: 'gameportal', event: 'score', score }, '*');
    move();
  });

  window.addEventListener('resize', move);
  move();
  parent.postMessage({ source: 'gameportal', event: 'ready' }, '*');
})();
JS;
    }
}
