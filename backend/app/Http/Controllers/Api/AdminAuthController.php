<?php

namespace App\Http\Controllers\Api;

use App\Http\ApiError;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

final class AdminAuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->safe()->only(['email', 'password']);
        $user = User::query()->where('email', $credentials['email'])->first();

        if ($user === null || ! Hash::check((string) $credentials['password'], $user->password)) {
            return ApiError::response('Invalid credentials.', 401, 'INVALID_CREDENTIALS', [
                'email' => ['The provided credentials are incorrect.'],
            ], $request->header('X-Request-Id'));
        }

        if (! $user->isAdmin()) {
            return ApiError::response('This action is unauthorized.', 403, 'FORBIDDEN', null, $request->header('X-Request-Id'));
        }

        return response()->json([
            'token' => $user->createToken('admin-dashboard')->plainTextToken,
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): Response
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($this->userPayload($user));
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->value,
        ];
    }
}
