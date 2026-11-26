<?php

namespace Tests\Feature;

use Tests\TestCase;

final class HealthTest extends TestCase
{
    public function test_health_returns_documented_payload(): void
    {
        $response = $this->withHeader('X-Request-Id', 'smoke-123')->getJson('/api/health');

        $response->assertOk()
            ->assertExactJson(['status' => 'ok', 'version' => '1.0.0'])
            ->assertHeader('X-Request-Id', 'smoke-123');
    }

    public function test_health_generates_a_correlation_id(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()->assertHeader('X-Request-Id');
        self::assertNotEmpty($response->headers->get('X-Request-Id'));
    }
}
