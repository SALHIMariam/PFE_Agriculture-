<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\NewsIndexRequest;
use App\Http\Resources\NewsItemResource;
use App\Models\NewsItem;
use Illuminate\Http\JsonResponse;

class NewsController extends Controller
{
    public function index(NewsIndexRequest $request): JsonResponse
    {
        $query = NewsItem::query()
            ->where('relevance_score', '>=', config('news.min_relevance_score'));

        // Insensible à la casse : `ilike` sur PostgreSQL (où `like` distingue
        // « Mildiou » de « mildiou »), `like` ailleurs (sqlite en test, déjà
        // insensible à la casse ASCII) — même convention que Admin\UserController.
        $like = $query->getConnection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        if ($crop = $request->validated('crop')) {
            $query->where('crop', $crop);
        }

        if ($disease = $request->validated('disease')) {
            $query->where('disease_class', $like, '%'.$disease.'%');
        }

        if ($category = $request->validated('category')) {
            $query->where('category', $category);
        }

        if ($search = $request->validated('search')) {
            $query->where(function ($q) use ($search, $like) {
                $q->where('title', $like, '%'.$search.'%')
                    ->orWhere('summary', $like, '%'.$search.'%');
            });
        }

        $perPage = (int) ($request->validated('per_page') ?? 12);

        $paginator = $query->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => NewsItemResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'last_updated' => NewsItem::latest('created_at')->value('created_at'),
        ]);
    }

    public function trending(): JsonResponse
    {
        $base = NewsItem::query()
            ->where('relevance_score', '>=', config('news.min_relevance_score'))
            ->where('published_at', '>=', now()->subDays(30));

        $crops = (clone $base)
            ->whereNotNull('crop')
            ->selectRaw('crop, count(*) as count')
            ->groupBy('crop')
            ->orderByDesc('count')
            ->limit(6)
            ->get()
            ->map(fn ($row) => ['crop' => $row->crop, 'count' => (int) $row->count])
            ->values()
            ->all();

        $categoryCounts = (clone $base)
            ->selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category');

        $categories = collect(config('news.categories'))
            ->map(fn ($category) => ['category' => $category, 'count' => (int) ($categoryCounts[$category] ?? 0)])
            ->values()
            ->all();

        return response()->json([
            'crops' => $crops,
            'categories' => $categories,
        ]);
    }
}
