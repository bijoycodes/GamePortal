<?php

namespace Tests\Unit;

use App\Enums\EventType;
use App\Enums\GameOrientation;
use App\Enums\GameSort;
use App\Enums\GameStatus;
use App\Enums\UploadStatus;
use App\Enums\UserRole;
use App\Support\JsonDepth;
use App\Support\Referrer;
use App\Support\TokenGenerator;
use PHPUnit\Framework\TestCase;

final class EnumsAndSupportTest extends TestCase
{
    public function test_enum_validation_rules_cover_all_cases(): void
    {
        foreach ([
            [GameStatus::class, 'in:draft,published,disabled,archived'],
            [UploadStatus::class, 'in:pending,processing,published,failed'],
            [EventType::class, 'in:start,end,score,level_complete,custom'],
            [UserRole::class, 'in:admin,player'],
            [GameOrientation::class, 'in:landscape,portrait,any'],
            [GameSort::class, 'in:popular,newest,title'],
        ] as [$enum, $expected]) {
            self::assertSame($expected, $enum::validationRule());
        }
    }

    public function test_session_token_is_opaque_and_64_characters(): void
    {
        $token = TokenGenerator::sessionToken();

        self::assertSame(64, strlen($token));
        self::assertMatchesRegularExpression('/^[A-Za-z0-9_-]{64}$/', $token);
        self::assertNotSame($token, TokenGenerator::sessionToken());
    }

    public function test_referrer_keeps_host_only(): void
    {
        self::assertSame('example.com', Referrer::sanitize('https://user:pass@example.com:443/path?x=1'));
        self::assertSame('example.com', Referrer::sanitize('example.com/path'));
        self::assertNull(Referrer::sanitize(null));
    }

    public function test_json_depth_is_limited(): void
    {
        self::assertSame(0, JsonDepth::of('scalar'));
        self::assertSame(1, JsonDepth::of(['a' => 1]));
        self::assertSame(3, JsonDepth::of(['a' => ['b' => ['c' => 1]]]));
    }
}
