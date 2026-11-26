<?php

namespace App\Http;

use Illuminate\Http\JsonResponse;

final class ApiError
{
    /** @param array<string, list<string>>|null $errors */
    public static function response(
        string $message,
        int $status,
        string $code,
        ?array $errors = null,
        ?string $requestId = null,
        array $headers = [],
    ): JsonResponse {
        $payload = [
            'message' => $message,
            'code' => $code,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        if ($requestId !== null) {
            $headers['X-Request-Id'] = $requestId;
        }

        return response()->json($payload, $status, $headers);
    }
}
