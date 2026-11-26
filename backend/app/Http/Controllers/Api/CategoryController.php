<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CategoryController extends Controller
{
    public function index(PaginationRequest $request): AnonymousResourceCollection
    {
        $categories = Category::query()
            ->active()
            ->ordered()
            ->withCount(['publishedGames as game_count'])
            ->paginate($request->perPage());

        return CategoryResource::collection($categories);
    }

    public function show(string $slug): CategoryResource
    {
        $category = Category::query()
            ->active()
            ->where('slug', $slug)
            ->withCount(['publishedGames as game_count'])
            ->firstOrFail();

        return new CategoryResource($category);
    }
}
