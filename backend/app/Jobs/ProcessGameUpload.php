<?php

namespace App\Jobs;

use App\Enums\UploadStatus;
use App\Exceptions\UploadFailure;
use App\Models\Game;
use App\Models\GameFile;
use App\Models\GameUpload;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

final class ProcessGameUpload implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 300;

    private const MIME_TYPES = [
        'html' => 'text/html',
        'htm' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'mjs' => 'application/javascript',
        'json' => 'application/json',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
        'mp3' => 'audio/mpeg',
        'ogg' => 'audio/ogg',
        'wav' => 'audio/wav',
        'm4a' => 'audio/mp4',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'txt' => 'text/plain',
    ];

    public function __construct(public readonly int $uploadId) {}

    public function handle(): void
    {
        $upload = GameUpload::query()->with('game')->find($this->uploadId);
        if ($upload === null || $upload->status === UploadStatus::Published) {
            return;
        }

        $game = $upload->game;
        $disk = Storage::disk($upload->disk);
        $stagingPrefix = sprintf('games/%s/staging/%d/', $game->uuid, $upload->id);
        $disk->deleteDirectory($stagingPrefix);
        $upload->update(['status' => UploadStatus::Processing, 'error_message' => null]);

        $tempPath = tempnam(sys_get_temp_dir(), 'gp-zip-');
        if ($tempPath === false) {
            $this->failUpload($upload, 'The archive could not be opened.');

            return;
        }

        $promoted = false;

        try {
            $this->copyRawPackage($disk, $upload, $tempPath);
            $this->assertCompressedSize($disk->size($upload->raw_path));
            $files = $this->readArchive($tempPath, $game, $upload, $disk, $stagingPrefix);
            $entryFile = $this->detectEntryFile($files);
            $this->promoteFiles($game, $upload, $disk, $stagingPrefix, $files, $entryFile);
            $promoted = true;
        } catch (UploadFailure $failure) {
            $this->failUpload($upload, $failure->getMessage());
        } catch (\Throwable $exception) {
            Log::error('Game upload processing failed', [
                'upload_id' => $upload->id,
                'game_uuid' => $game->uuid,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);
            $this->failUpload($upload, 'The archive could not be processed.');
        } finally {
            if (is_file($tempPath)) {
                unlink($tempPath);
            }

            if (! $promoted) {
                $disk->deleteDirectory($stagingPrefix);
            }
        }
    }

    /** @param Filesystem $disk */
    private function copyRawPackage($disk, GameUpload $upload, string $tempPath): void
    {
        $source = $disk->readStream($upload->raw_path);
        $target = fopen($tempPath, 'wb');
        if ($source === false || $target === false) {
            if (is_resource($source)) {
                fclose($source);
            }

            if (is_resource($target)) {
                fclose($target);
            }

            throw new UploadFailure('The archive could not be opened.');
        }

        stream_copy_to_stream($source, $target);
        fclose($source);
        fclose($target);
    }

    private function assertCompressedSize(int $bytes): void
    {
        $limit = (int) config('game-package.max_compressed_bytes', 52428800);
        if ($bytes > $limit) {
            throw new UploadFailure(sprintf(
                'Package exceeds the %d MB upload limit.',
                (int) round($limit / 1048576),
            ));
        }
    }

    /**
     * @param  Filesystem  $disk
     * @return list<array{path: string, staging_key: string, mime: string, size: int, sha256: string}>
     */
    private function readArchive(
        string $tempPath,
        Game $game,
        GameUpload $upload,
        $disk,
        string $stagingPrefix,
    ): array {
        $zip = new ZipArchive;
        if ($zip->open($tempPath, ZipArchive::RDONLY) !== true) {
            throw new UploadFailure('The archive could not be opened.');
        }

        $maxFiles = (int) config('game-package.max_files', 500);
        if ($zip->numFiles > $maxFiles) {
            $zip->close();
            throw new UploadFailure("Package contains more than {$maxFiles} files.");
        }

        $allowed = array_map('strtolower', (array) config('game-package.allowed_extensions', []));
        $denied = array_map('strtolower', (array) config('game-package.denied_extensions', []));
        $singleLimit = (int) config('game-package.max_single_file_bytes', 26214400);
        $totalLimit = (int) config('game-package.max_uncompressed_bytes', 157286400);
        $seen = [];
        $totalSize = 0;
        $files = [];

        try {
            for ($index = 0; $index < $zip->numFiles; $index++) {
                $stat = $zip->statIndex($index);
                if ($stat === false) {
                    throw new UploadFailure('The archive could not be opened.');
                }

                $name = (string) $stat['name'];
                $this->assertSafePath($name);

                $isDirectory = str_ends_with($name, '/') && (int) $stat['size'] === 0;
                if ($isDirectory) {
                    continue;
                }

                $extension = strtolower((string) pathinfo($name, PATHINFO_EXTENSION));

                if (in_array($extension, $denied, true) || ! in_array($extension, $allowed, true)) {
                    throw new UploadFailure("Archive contains a disallowed file type: {$extension}.");
                }

                if ($this->isSymlink($zip, $index)) {
                    throw new UploadFailure("Archive contains an unsafe path: {$name}.");
                }

                $key = strtolower($name);
                if (isset($seen[$key])) {
                    throw new UploadFailure("Archive contains duplicate paths: {$name}.");
                }
                $seen[$key] = true;

                if ((int) $stat['size'] > $singleLimit) {
                    throw new UploadFailure("Archive contains a file larger than 25 MB: {$name}.");
                }

                $totalSize += (int) $stat['size'];
                if ($totalSize > $totalLimit) {
                    throw new UploadFailure(sprintf(
                        'Package exceeds the %d MB uncompressed limit.',
                        (int) round($totalLimit / 1048576),
                    ));
                }

                $contents = $zip->getFromIndex($index);
                if (! is_string($contents)) {
                    throw new UploadFailure('The archive could not be opened.');
                }

                $stagingKey = $stagingPrefix.$name;
                $disk->put($stagingKey, $contents);
                $files[] = [
                    'path' => $name,
                    'staging_key' => $stagingKey,
                    'mime' => $disk->mimeType($stagingKey) ?: (self::MIME_TYPES[$extension] ?? 'application/octet-stream'),
                    'size' => strlen($contents),
                    'sha256' => hash('sha256', $contents),
                ];
            }
        } finally {
            $zip->close();
        }

        return $files;
    }

    private function assertSafePath(string $name): void
    {
        $maxLength = (int) config('game-package.max_entry_path_length', 255);
        $unsafe = $name === ''
            || strlen($name) > $maxLength
            || str_contains($name, "\0")
            || str_contains($name, '\\')
            || str_starts_with($name, '/')
            || preg_match('/^[A-Za-z]:/', $name) === 1;

        if (! $unsafe) {
            foreach (explode('/', rtrim($name, '/')) as $segment) {
                if ($segment === '' || $segment === '.' || $segment === '..') {
                    $unsafe = true;
                    break;
                }
            }
        }

        if ($unsafe) {
            throw new UploadFailure("Archive contains an unsafe path: {$name}.");
        }
    }

    private function isSymlink(ZipArchive $zip, int $index): bool
    {
        if (! $zip->getExternalAttributesIndex($index, $operatingSystem, $attributes)) {
            return false;
        }

        if ($operatingSystem !== ZipArchive::OPSYS_UNIX) {
            return false;
        }

        return (($attributes >> 16) & 0170000) === 0120000;
    }

    /**
     * @param  list<array{path: string, staging_key: string, mime: string, size: int, sha256: string}>  $files
     */
    private function detectEntryFile(array $files): string
    {
        $paths = array_column($files, 'path');

        foreach ((array) config('game-package.entry_candidates', ['index.html', 'index.htm']) as $candidate) {
            if (in_array($candidate, $paths, true)) {
                return (string) $candidate;
            }
        }

        $rootHtml = array_values(array_filter(
            $paths,
            fn (string $path): bool => ! str_contains($path, '/')
                && in_array(strtolower((string) pathinfo($path, PATHINFO_EXTENSION)), ['html', 'htm'], true),
        ));

        if (count($rootHtml) === 1) {
            return $rootHtml[0];
        }

        throw new UploadFailure('No index.html or single root HTML entry file was found.');
    }

    /**
     * @param  list<array{path: string, staging_key: string, mime: string, size: int, sha256: string}>  $files
     */
    private function promoteFiles(
        Game $game,
        GameUpload $upload,
        $disk,
        string $stagingPrefix,
        array $files,
        string $entryFile,
    ): void {
        $finalPrefix = sprintf('games/%s/files/', $game->uuid);

        foreach (GameFile::query()->where('game_id', $game->id)->get() as $oldFile) {
            $disk->delete($finalPrefix.$oldFile->path);
        }

        foreach ($files as $file) {
            $disk->move($file['staging_key'], $finalPrefix.$file['path']);
        }

        DB::transaction(function () use ($game, $upload, $files, $entryFile): void {
            GameFile::query()->where('game_id', $game->id)->delete();

            foreach ($files as $file) {
                GameFile::create([
                    'game_id' => $game->id,
                    'upload_id' => $upload->id,
                    'path' => $file['path'],
                    'disk' => $upload->disk,
                    'mime' => $file['mime'],
                    'size' => $file['size'],
                    'sha256' => $file['sha256'],
                    'is_entry' => $file['path'] === $entryFile,
                ]);
            }

            $game->update(['entry_file' => $entryFile]);
            $upload->update([
                'status' => UploadStatus::Published,
                'file_count' => count($files),
                'total_size' => array_sum(array_column($files, 'size')),
                'processed_at' => now(),
                'error_message' => null,
            ]);
        });
    }

    private function failUpload(GameUpload $upload, string $message): void
    {
        $upload->update([
            'status' => UploadStatus::Failed,
            'error_message' => $message,
            'processed_at' => now(),
        ]);
    }
}
