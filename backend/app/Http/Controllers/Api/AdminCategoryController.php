<?php

namespace App\Http\Controllers\Api;

use App\Http\ApiError;
use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class AdminCategoryController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(PaginationRequest $request): AnonymousResourceCollection
    {
        $categories = Category::query()
            ->withCount(['games as game_count'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($request->perPage());

        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] ??= Str::slug((string) $data['name']);

        if (Category::query()->where('slug', $data['slug'])->exists()) {
            return ApiError::response('The slug has already been taken.', 409, 'CONFLICT', [
                'slug' => ['The slug has already been taken.'],
            ]);
        }

        $category = Category::create($data);
        $this->audit->record('category.created', Category::class, $category->id, ['slug' => $category->slug]);

        return (new CategoryResource($category))->response()->setStatusCode(201);
    }

    public function update(UpdateCategoryRequest $request, int $id): CategoryResource
    {
        $category = Category::findOrFail($id);
        $category->update($request->validated());

        $this->audit->record('category.updated', Category::class, $category->id, [
            'fields' => array_keys($request->validated()),
        ]);

        return new CategoryResource($category);
    }

    public function destroy(int $id): JsonResponse|Response
    {
        $category = Category::findOrFail($id);
        if ($category->games()->exists()) {
            return ApiError::response('Category has games and cannot be deleted.', 409, 'CONFLICT', [
                'category' => ['Move or delete the games in this category first.'],
            ]);
        }

        $category->delete();
        $this->audit->record('category.deleted', Category::class, $id, ['slug' => $category->slug]);

        return response()->noContent();
    }
}
