<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        RateLimiter::for('admin-login', fn (Request $request): Limit => Limit::perMinute(5)
            ->by('login:'.$request->ip().'|'.strtolower((string) $request->input('email', ''))));

        RateLimiter::for('game-events', fn (Request $request): Limit => Limit::perMinute(
            (int) config('game-settings.event_rate_limit', 60),
        )->by('events:'.(string) $request->route('session_token')));
    }
}
