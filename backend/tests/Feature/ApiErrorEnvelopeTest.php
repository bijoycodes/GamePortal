<?php

namespace Tests\Feature;

use App\Exceptions\ApiExceptionRenderer;
use App\Models\Game;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

final class ApiErrorEnvelopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_renderer_uses_documented_envelope_and_echoes_request_id(): void
    {
        $renderer = app(ApiExceptionRenderer::class);
        $request = Request::create('/api/games', 'GET');
        $request->headers->set('X-Request-Id', 'req-123');

        $cases = [
            [ValidationException::withMessages(['title' => ['The title field is required.']]), 422, 'VALIDATION_ERROR'],
            [new AuthenticationException, 401, 'UNAUTHENTICATED'],
            [new AuthorizationException, 403, 'FORBIDDEN'],
            [(new ModelNotFoundException)->setModel(Game::class, [999]), 404, 'NOT_FOUND'],
            [new ConflictHttpException('Slug already in use.'), 409, 'CONFLICT'],
            [new ThrottleRequestsException('Too many requests.', null, ['Retry-After' => '60']), 429, 'RATE_LIMITED'],
        ];

        foreach ($cases as [$exception, $status, $code]) {
            $response = $renderer->render($exception, $request);

            self::assertNotNull($response);
            self::assertSame($status, $response->getStatusCode());
            self::assertSame('req-123', $response->headers->get('X-Request-Id'));

            $payload = json_decode((string) $response->getContent(), true);
            self::assertSame($code, $payload['code']);
            self::assertIsString($payload['message']);
        }

        $validation = json_decode((string) $renderer->render($cases[0][0], $request)?->getContent(), true);
        self::assertSame(['title' => ['The title field is required.']], $validation['errors']);

        $throttled = $renderer->render($cases[5][0], $request);
        self::assertSame('60', $throttled?->headers->get('Retry-After'));
    }

    public function test_unexpected_exception_returns_generic_500_and_is_logged(): void
    {
        Log::spy();

        $renderer = app(ApiExceptionRenderer::class);
        $request = Request::create('/api/health', 'GET');
        $response = $renderer->render(new RuntimeException('database password=secret'), $request);

        self::assertNotNull($response);
        self::assertSame(500, $response->getStatusCode());

        $payload = json_decode((string) $response->getContent(), true);
        self::assertSame('INTERNAL_ERROR', $payload['code']);
        self::assertSame('Server error.', $payload['message']);
        self::assertStringNotContainsString('password=secret', (string) $response->getContent());
        self::assertNotNull($response->headers->get('X-Request-Id'));

        Log::shouldHaveReceived('error')->once();
    }

    public function test_game_host_not_found_is_plain_text(): void
    {
        $request = Request::create('/g/missing-game/index.html', 'GET');
        $request->headers->set('X-Request-Id', 'host-req-1');

        $response = app(ApiExceptionRenderer::class)
            ->render(new NotFoundHttpException, $request);

        self::assertNotNull($response);
        self::assertSame(404, $response->getStatusCode());
        self::assertSame('text/plain; charset=utf-8', $response->headers->get('Content-Type'));
        self::assertSame('Game unavailable', $response->getContent());
        self::assertSame('host-req-1', $response->headers->get('X-Request-Id'));
    }

    public function test_http_error_routes_return_json_envelope_with_request_id(): void
    {
        $response = $this->withHeader('X-Request-Id', 'route-req-1')
            ->getJson('/api/games/does-not-exist');

        $response->assertNotFound()
            ->assertHeader('X-Request-Id', 'route-req-1')
            ->assertJsonPath('code', 'NOT_FOUND')
            ->assertJsonPath('message', 'Not found.');
    }
}
