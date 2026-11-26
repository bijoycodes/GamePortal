<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class TagController extends Controller
{
    public function index(PaginationRequest $request): AnonymousResourceCollection
    {
        $tags = Tag::query()
            ->withCount(['games as game_count' => fn ($query) => $query->published()])
            ->orderBy('name')
            ->paginate($request->perPage());

        return TagResource::collection($tags);
    }
}
