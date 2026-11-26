<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class GameHostHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $frontendOrigin = rtrim((string) config('app.frontend_url'), '/');
        $csp = "default-src 'self' data: blob:; "
            ."script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; "
            ."style-src 'self' 'unsafe-inline'; "
            ."img-src 'self' data: blob:; "
            ."media-src 'self' data: blob:; "
            ."connect-src 'self' data: blob:; "
            ."font-src 'self' data:; "
            ."object-src 'none'; base-uri 'none'; form-action 'none'; "
            ."frame-ancestors {$frontendOrigin}";

        $response->headers->set('Content-Security-Policy', $csp);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
        $response->headers->remove('Set-Cookie');
        $response->headers->remove('X-XSS-Protection');

        return $response;
    }
}
