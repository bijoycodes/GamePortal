<?php

use App\Http\Controllers\Api\AdminAnalyticsController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminGameController;
use App\Http\Controllers\Api\AdminTagController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\GameHostController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\ThumbnailController;
use Illuminate\Support\Facades\Route;

Route::get('/api/health', HealthController::class);

Route::prefix('api')->group(function (): void {
    Route::get('/games', [GameController::class, 'index']);
    Route::post('/games/{slug}/sessions', [SessionController::class, 'create'])
        ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*');
    Route::get('/games/{slug}', [GameController::class, 'show'])
        ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*');

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show'])
        ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*');
    Route::get('/tags', [TagController::class, 'index']);

    Route::patch('/sessions/{session_token}', [SessionController::class, 'end'])
        ->where('session_token', '[A-Za-z0-9_-]{64}');
    Route::post('/sessions/{session_token}/events', [SessionController::class, 'event'])
        ->middleware('throttle:game-events')
        ->where('session_token', '[A-Za-z0-9_-]{64}');

    Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:admin-login');

    Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function (): void {
        Route::post('/logout', [AdminAuthController::class, 'logout']);
        Route::get('/me', [AdminAuthController::class, 'me']);

        Route::get('/games', [AdminGameController::class, 'index']);
        Route::post('/games', [AdminGameController::class, 'store']);
        Route::get('/games/{id}', [AdminGameController::class, 'show'])->whereNumber('id');
        Route::match(['put', 'patch'], '/games/{id}', [AdminGameController::class, 'update'])->whereNumber('id');
        Route::delete('/games/{id}', [AdminGameController::class, 'destroy'])->whereNumber('id');
        Route::post('/games/{id}/publish', [AdminGameController::class, 'publish'])->whereNumber('id');
        Route::post('/games/{id}/disable', [AdminGameController::class, 'disable'])->whereNumber('id');
        Route::post('/games/{id}/archive', [AdminGameController::class, 'archive'])->whereNumber('id');
        Route::post('/games/{id}/upload', [AdminGameController::class, 'upload'])->whereNumber('id');
        Route::get('/games/{id}/uploads', [AdminGameController::class, 'uploads'])->whereNumber('id');
        Route::delete('/uploads/{uploadId}', [AdminGameController::class, 'deleteUpload'])->whereNumber('uploadId');

        Route::get('/categories', [AdminCategoryController::class, 'index']);
        Route::post('/categories', [AdminCategoryController::class, 'store']);
        Route::match(['put', 'patch'], '/categories/{id}', [AdminCategoryController::class, 'update'])->whereNumber('id');
        Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy'])->whereNumber('id');

        Route::get('/tags', [AdminTagController::class, 'index']);
        Route::post('/tags', [AdminTagController::class, 'store']);
        Route::match(['put', 'patch'], '/tags/{id}', [AdminTagController::class, 'update'])->whereNumber('id');
        Route::delete('/tags/{id}', [AdminTagController::class, 'destroy'])->whereNumber('id');

        Route::get('/analytics/overview', [AdminAnalyticsController::class, 'overview']);
        Route::get('/analytics/games/{id}', [AdminAnalyticsController::class, 'game'])->whereNumber('id');
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });
});

Route::middleware(['game.host', 'game.headers'])->group(function (): void {
    Route::get('/g/{slug}', [GameHostController::class, 'index'])
        ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*');
    Route::get('/g/{slug}/{path}', [GameHostController::class, 'file'])
        ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)*')
        ->where('path', '.*');
});

Route::get('/storage/{path}', ThumbnailController::class)
    ->where('path', '.*')
    ->middleware('signed')
    ->name('thumbnail.show');
