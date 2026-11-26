<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Http\Requests\StoreTagRequest;
use App\Http\Requests\UpdateTagRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class AdminTagController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(PaginationRequest $request): AnonymousResourceCollection
    {
        return TagResource::collection(
            Tag::query()->orderBy('name')->paginate($request->perPage()),
        );
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] ??= Str::slug((string) $data['name']);

        $tag = Tag::create($data);
        $this->audit->record('tag.created', Tag::class, $tag->id, ['slug' => $tag->slug]);

        return (new TagResource($tag))->response()->setStatusCode(201);
    }

    public function update(UpdateTagRequest $request, int $id): TagResource
    {
        $tag = Tag::findOrFail($id);
        $tag->update($request->validated());

        $this->audit->record('tag.updated', Tag::class, $tag->id, [
            'fields' => array_keys($request->validated()),
        ]);

        return new TagResource($tag);
    }

    public function destroy(int $id): Response
    {
        $tag = Tag::findOrFail($id);
        $tag->games()->detach();
        $tag->delete();

        $this->audit->record('tag.deleted', Tag::class, $id, ['slug' => $tag->slug]);

        return response()->noContent();
    }
}
