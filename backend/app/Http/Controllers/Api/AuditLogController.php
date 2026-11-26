<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AuditLogController extends Controller
{
    public function index(PaginationRequest $request): AnonymousResourceCollection
    {
        return AuditLogResource::collection(
            AuditLog::query()->with('user')->orderByDesc('created_at')->paginate($request->perPage()),
        );
    }
}
