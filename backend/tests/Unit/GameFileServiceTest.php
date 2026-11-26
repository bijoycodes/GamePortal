<?php

namespace Tests\Unit;

use App\Services\GameFileService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class GameFileServiceTest extends TestCase
{
    public function test_safe_paths_are_preserved(): void
    {
        $service = new GameFileService;

        self::assertSame('index.html', $service->normalizePath('index.html'));
        self::assertSame('assets/img/logo.png', $service->normalizePath('assets/img/logo.png'));
        self::assertSame('a/b', $service->normalizePath('./a/b'));
    }

    /** @return iterable<string, array{string}> */
    public static function unsafePaths(): iterable
    {
        yield 'parent traversal' => ['../secret.txt'];
        yield 'embedded traversal' => ['assets/../../secret.txt'];
        yield 'backslash' => ['assets\\secret.txt'];
        yield 'absolute' => ['/etc/passwd'];
        yield 'null byte' => ["index.html\0.png"];
        yield 'windows drive' => ['C:/secret.txt'];
        yield 'empty' => [''];
    }

    #[DataProvider('unsafePaths')]
    public function test_unsafe_paths_are_rejected(string $path): void
    {
        self::assertNull((new GameFileService)->normalizePath($path));
    }
}
