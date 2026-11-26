<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureGameHost
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! app()->environment('testing')) {
            $expectedHost = parse_url((string) config('app.game_host_url'), PHP_URL_HOST);

            if (! is_string($expectedHost) || ! hash_equals($expectedHost, $request->getHost())) {
                return response('Game unavailable', 404, ['Content-Type' => 'text/plain; charset=utf-8']);
            }
        }

        return $next($request);
    }
}
