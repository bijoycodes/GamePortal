<?php

namespace Tests\Feature;

use App\Enums\UploadStatus;
use App\Jobs\ProcessGameUpload;
use App\Models\Game;
use App\Models\GameFile;
use App\Models\GameUpload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesZipPackages;
use Tests\TestCase;

final class ProcessGameUploadTest extends TestCase
{
    use CreatesZipPackages;
    use RefreshDatabase;

    private Game $game;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('games');
        $this->game = Game::factory()->create(['entry_file' => null]);
    }

    public function test_valid_package_is_extracted_promoted_and_indexed(): void
    {
        $zip = $this->zipPackage([
            'index.html' => '<html><body>Neon Runner</body></html>',
            'assets/app.js' => 'console.log("ready");',
            'assets/style.css' => 'body { color: white; }',
        ]);
        $upload = $this->pendingUpload($zip);

        (new ProcessGameUpload($upload->id))->handle();

        $upload->refresh();
        self::assertSame(UploadStatus::Published, $upload->status);
        self::assertSame(3, $upload->file_count);
        self::assertSame(
            strlen('<html><body>Neon Runner</body></html>') + strlen('console.log("ready");')
                + strlen('body { color: white; }'),
            $upload->total_size,
        );
        self::assertNotNull($upload->processed_at);
        self::assertNull($upload->error_message);
        self::assertSame('index.html', $this->game->fresh()->entry_file);

        $paths = GameFile::query()->where('game_id', $this->game->id)->pluck('path')->all();
        sort($paths);
        self::assertSame(['assets/app.js', 'assets/style.css', 'index.html'], $paths);

        $entry = GameFile::query()->where('path', 'index.html')->firstOrFail();
        self::assertTrue($entry->is_entry);
        self::assertSame('text/html', $entry->mime);
        self::assertSame(hash('sha256', '<html><body>Neon Runner</body></html>'), $entry->sha256);
        Storage::disk('games')->assertExists('games/'.$this->game->uuid.'/files/index.html');
        Storage::disk('games')->assertExists('games/'.$this->game->uuid.'/files/assets/app.js');
        Storage::disk('games')->assertDirectoryEmpty(
            'games/'.$this->game->uuid.'/staging/'.$upload->id,
        );
    }

    public function test_unsafe_path_fails_with_documented_message_and_no_files(): void
    {
        $upload = $this->pendingUpload($this->zipPackage(['../evil.html' => 'bad']));

        (new ProcessGameUpload($upload->id))->handle();

        $this->assertFailed($upload, 'Archive contains an unsafe path: ../evil.html.');
        $this->assertNoFiles();
    }

    public function test_disallowed_extension_fails_with_documented_message(): void
    {
        $upload = $this->pendingUpload($this->zipPackage([
            'index.html' => '<html></html>',
            'shell.php' => '<?php echo "bad"; ?>',
        ]));

        (new ProcessGameUpload($upload->id))->handle();

        $this->assertFailed($upload, 'Archive contains a disallowed file type: php.');
        $this->assertNoFiles();
    }

    public function test_symlink_entry_is_rejected(): void
    {
        $upload = $this->pendingUpload($this->zipPackage(
            ['index.html' => '<html></html>'],
            ['link.html'],
        ));

        (new ProcessGameUpload($upload->id))->handle();

        $this->assertFailed($upload, 'Archive contains an unsafe path: link.html.');
        $this->assertNoFiles();
    }

    public function test_case_colliding_paths_are_rejected(): void
    {
        $upload = $this->pendingUpload($this->zipPackage([
            'index.html' => '<html></html>',
            'INDEX.html' => '<html>duplicate</html>',
        ]));

        (new ProcessGameUpload($upload->id))->handle();

        $this->assertFailed($upload, 'Archive contains duplicate paths: INDEX.html.');
        $this->assertNoFiles();
    }

    public function test_missing_entry_file_fails_with_documented_message(): void
    {
        $upload = $this->pendingUpload($this->zipPackage(['readme.txt' => 'hello']));

        (new ProcessGameUpload($upload->id))->handle();

        $this->assertFailed($upload, 'No index.html or single root HTML entry file was found.');
        $this->assertNoFiles();
    }

    public function test_corrupt_archive_fails_with_documented_message(): void
    {
        $upload = $this->pendingUpload($this->zipPackage(['index.html' => '<html></html>']));
        Storage::disk('games')->put($upload->raw_path, 'not-a-zip');

        (new ProcessGameUpload($upload->id))->handle();

        $this->assertFailed($upload, 'The archive could not be opened.');
        $this->assertNoFiles();
    }

    public function test_failed_upload_does_not_remove_previously_published_files(): void
    {
        $first = $this->pendingUpload($this->zipPackage(['index.html' => '<html>v1</html>']));
        (new ProcessGameUpload($first->id))->handle();
        $first->refresh();
        $fileIds = GameFile::query()->pluck('id')->all();

        $second = $this->pendingUpload($this->zipPackage(['../evil.html' => 'bad']));
        (new ProcessGameUpload($second->id))->handle();

        $this->assertFailed($second, 'Archive contains an unsafe path: ../evil.html.');
        self::assertSame($fileIds, GameFile::query()->pluck('id')->all());
        self::assertSame('index.html', $this->game->fresh()->entry_file);
        Storage::disk('games')->assertExists('games/'.$this->game->uuid.'/files/index.html');
        self::assertSame(
            '<html>v1</html>',
            Storage::disk('games')->get('games/'.$this->game->uuid.'/files/index.html'),
        );
    }

    private function pendingUpload(string $zipPath): GameUpload
    {
        $upload = GameUpload::factory()->pending()->create([
            'game_id' => $this->game->id,
            'raw_path' => 'games/'.$this->game->uuid.'/raw/'.$this->game->uuid.'.zip',
        ]);
        Storage::disk('games')->put($upload->raw_path, (string) file_get_contents($zipPath));

        return $upload;
    }

    private function assertFailed(GameUpload $upload, string $message): void
    {
        $upload->refresh();

        self::assertSame(UploadStatus::Failed, $upload->status);
        self::assertSame($message, $upload->error_message);
        self::assertNotNull($upload->processed_at);
        Storage::disk('games')->assertDirectoryEmpty(
            'games/'.$this->game->uuid.'/staging/'.$upload->id,
        );
    }

    private function assertNoFiles(): void
    {
        self::assertSame(0, GameFile::query()->where('game_id', $this->game->id)->count());
        self::assertNull($this->game->fresh()->entry_file);
    }
}
