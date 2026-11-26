<?php

namespace Tests\Feature;

use App\Enums\UploadStatus;
use App\Jobs\ProcessGameUpload;
use App\Models\AuditLog;
use App\Models\Game;
use App\Models\GameUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class GameUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('games');
        Queue::fake();
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);
    }

    public function test_upload_is_stored_and_dispatched(): void
    {
        $game = Game::factory()->create();

        $response = $this->post('/api/admin/games/'.$game->id.'/upload', [
            'package' => UploadedFile::fake()->create('neon-runner.zip', 32, 'application/zip'),
        ]);

        $response->assertStatus(202)
            ->assertJsonPath('message', 'Upload queued for processing.')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.original_filename', 'neon-runner.zip');

        $upload = GameUpload::query()->firstOrFail();
        self::assertSame(UploadStatus::Pending, $upload->status);
        self::assertStringStartsWith('games/'.$game->uuid.'/raw/', $upload->raw_path);
        Storage::disk('games')->assertExists($upload->raw_path);
        self::assertSame('game.uploaded', AuditLog::query()->latest()->value('action'));

        Queue::assertPushed(ProcessGameUpload::class, fn (ProcessGameUpload $job): bool => $job->uploadId === $upload->id);
    }

    public function test_upload_rejects_wrong_mime_type(): void
    {
        $game = Game::factory()->create();

        $this->post('/api/admin/games/'.$game->id.'/upload', [
            'package' => UploadedFile::fake()->create('malware.exe', 32, 'application/x-msdownload'),
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['package']]);

        self::assertSame(0, GameUpload::query()->count());
    }

    public function test_upload_history_and_deletion(): void
    {
        $game = Game::factory()->create();
        $upload = GameUpload::factory()->for($game)->create([
            'raw_path' => 'games/'.$game->uuid.'/raw/1-game.zip',
        ]);
        Storage::disk('games')->put($upload->raw_path, 'raw-bytes');

        $this->getJson('/api/admin/games/'.$game->id.'/uploads')
            ->assertOk()
            ->assertJsonPath('data.0.id', $upload->id);

        $this->deleteJson('/api/admin/uploads/'.$upload->id)->assertNoContent();
        Storage::disk('games')->assertMissing($upload->raw_path);
        self::assertNull(GameUpload::query()->find($upload->id));
        self::assertSame('upload.deleted', AuditLog::query()->latest()->value('action'));
    }
}
