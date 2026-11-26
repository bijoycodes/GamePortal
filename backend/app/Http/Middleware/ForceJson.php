<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class ForceJson
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-Id');
        if (! is_string($requestId) || preg_match('/^[A-Za-z0-9._:-]{1,128}$/', $requestId) !== 1) {
            $requestId = Str::uuid()->toString();
        }

        $request->headers->set('X-Request-Id', $requestId);
        if ($request->is('api/*')) {
            $request->headers->set('Accept', 'application/json');
        }

        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
