<?php

namespace App\Exceptions;

use App\Http\ApiError;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class ApiExceptionRenderer
{
    private const STATUS_CODES = [
        400 => 'BAD_REQUEST',
        401 => 'UNAUTHENTICATED',
        403 => 'FORBIDDEN',
        404 => 'NOT_FOUND',
        409 => 'CONFLICT',
        413 => 'PAYLOAD_TOO_LARGE',
        422 => 'VALIDATION_ERROR',
        429 => 'RATE_LIMITED',
        500 => 'INTERNAL_ERROR',
    ];

    public function render(Throwable $exception, Request $request): ?Response
    {
        $requestId = $request->header('X-Request-Id');
        $requestId = is_string($requestId) && $requestId !== '' ? $requestId : Str::uuid()->toString();
        $request->headers->set('X-Request-Id', $requestId);

        if ($request->is('g/*') && $exception instanceof NotFoundHttpException) {
            return response('Game unavailable', 404, [
                'Content-Type' => 'text/plain; charset=utf-8',
                'X-Request-Id' => $requestId,
            ]);
        }

        if ($exception instanceof ValidationException) {
            return ApiError::response(
                'The given data was invalid.',
                422,
                'VALIDATION_ERROR',
                $exception->errors(),
                $requestId,
            );
        }

        if ($exception instanceof AuthenticationException) {
            return ApiError::response('Unauthenticated.', 401, 'UNAUTHENTICATED', null, $requestId);
        }

        if ($exception instanceof AuthorizationException) {
            return ApiError::response('This action is unauthorized.', 403, 'FORBIDDEN', null, $requestId);
        }

        if ($exception instanceof ThrottleRequestsException) {
            return ApiError::response(
                'Too many requests.',
                429,
                'RATE_LIMITED',
                null,
                $requestId,
                $exception->getHeaders(),
            );
        }

        if ($exception instanceof ModelNotFoundException || $exception instanceof NotFoundHttpException) {
            return ApiError::response('Not found.', 404, 'NOT_FOUND', null, $requestId);
        }

        if ($exception instanceof HttpException) {
            $status = $exception->getStatusCode();
            $code = self::STATUS_CODES[$status] ?? ($status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');

            return ApiError::response(
                $status >= 500 ? 'Server error.' : $exception->getMessage(),
                $status,
                $code,
                null,
                $requestId,
                $exception->getHeaders(),
            );
        }

        Log::error('Unhandled exception', [
            'request_id' => $requestId,
            'url' => $request->fullUrl(),
            'exception' => $exception::class,
            'message' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        return ApiError::response('Server error.', 500, 'INTERNAL_ERROR', null, $requestId);
    }
}
