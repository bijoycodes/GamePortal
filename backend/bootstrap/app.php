<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureGameHost;
use App\Http\Middleware\ForceJson;
use App\Http\Middleware\GameHostHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(ForceJson::class);
        $middleware->alias([
            'admin' => EnsureAdmin::class,
            'game.host' => EnsureGameHost::class,
            'game.headers' => GameHostHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request): bool => $request->is('api/*'));
        $exceptions->render(fn (Throwable $exception, Request $request) => app(ApiExceptionRenderer::class)
            ->render($exception, $request));
    })
    ->create();

// Every configuration key used by this application is defined in config/. Keeping
// the framework base config out also avoids deprecated PDO constants on PHP 8.5.
$app->dontMergeFrameworkConfiguration();

return $app;
