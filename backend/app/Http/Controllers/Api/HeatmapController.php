<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HeatmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HeatmapController extends Controller
{
    public function __construct(private HeatmapService $heatmapService)
    {
    }

    public function points(Request $request): JsonResponse
    {
        return response()->json([
            'points' => $this->heatmapService->points($this->filters($request)),
        ]);
    }

    public function ranking(Request $request): JsonResponse
    {
        return response()->json([
            'ranking' => $this->heatmapService->ranking($this->filters($request)),
        ]);
    }

    public function timeline(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', now()->year);

        return response()->json([
            'year' => $year,
            'timeline' => $this->heatmapService->timeline($year, $this->filters($request)),
        ]);
    }

    public function alerts(): JsonResponse
    {
        return response()->json([
            'alerts' => $this->heatmapService->alerts(),
        ]);
    }

    public function summary(Request $request, string $governorate): JsonResponse
    {
        $summary = $this->heatmapService->summary($governorate, $this->filters($request));

        if (! $summary) {
            return response()->json(['message' => 'Gouvernorat introuvable.'], 404);
        }

        return response()->json($summary);
    }

    private function filters(Request $request): array
    {
        return [
            'plant' => $request->get('plant'),
            'disease' => $request->get('disease'),
            'from' => $request->get('from'),
            'to' => $request->get('to'),
            'status' => $request->get('status', 'validated'),
            'min_confidence' => $request->get('min_confidence'),
        ];
    }
}
