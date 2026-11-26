<?php

namespace Tests\Unit;

use Tests\TestCase;

final class GamePackagePolicyTest extends TestCase
{
    public function test_package_policy_is_loaded_from_shared_json(): void
    {
        self::assertContains('html', config('game-package.allowed_extensions'));
        self::assertContains('php', config('game-package.denied_extensions'));
        self::assertContains('index.html', config('game-package.entry_candidates'));
        self::assertSame(50 * 1024 * 1024, config('game-package.max_compressed_bytes'));
        self::assertSame(150 * 1024 * 1024, config('game-package.max_uncompressed_bytes'));
        self::assertSame(500, config('game-package.max_files'));
    }
}
