<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExpertAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpertAnalyticsController extends Controller
{
    public function __construct(private readonly ExpertAnalyticsService $expertAnalyticsService)
    {
    }

    /**
     * GET /api/expert-analytics/combined — bundles every Layer 1 widget's data
     * in a single response (same underlying queries as the individual
     * endpoints below). Lets the frontend fire 1 request instead of 8 in
     * parallel, which matters locally since `php artisan serve`'s built-in
     * PHP server processes requests one at a time.
     */
    public function combined(Request $request): JsonResponse
    {
        $user = $request->user();
        $filters = $this->filters($request);

        return response()->json([
            'overview' => $this->expertAnalyticsService->overview($user, $filters),
            'agreement' => $this->expertAnalyticsService->agreement($user, $filters),
            'corrections' => $this->expertAnalyticsService->corrections($user, $filters),
            'workload' => $this->expertAnalyticsService->workload($user, $filters),
            'response_time' => $this->expertAnalyticsService->responseTime($user, $filters),
            'disease_validation' => $this->expertAnalyticsService->diseaseValidation($user, $filters),
            'confidence_correction' => $this->expertAnalyticsService->confidenceCorrection($user, $filters),
            'contribution' => $this->expertAnalyticsService->contribution($user, $filters),
        ]);
    }

    /** GET /api/expert-analytics/overview */
    public function overview(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->overview($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-analytics/agreement */
    public function agreement(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->agreement($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-analytics/corrections */
    public function corrections(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->corrections($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-analytics/workload?expert_id= (admin uniquement) */
    public function workload(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->workload($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-analytics/response-time */
    public function responseTime(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->responseTime($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-analytics/disease-validation */
    public function diseaseValidation(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->diseaseValidation($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-analytics/confidence-correction */
    public function confidenceCorrection(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->confidenceCorrection($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-analytics/contribution */
    public function contribution(Request $request): JsonResponse
    {
        return response()->json($this->expertAnalyticsService->contribution($request->user(), $this->filters($request)));
    }

    private function filters(Request $request): array
    {
        return [
            'start_date' => $request->query('start_date'),
            'end_date' => $request->query('end_date'),
            'disease' => $request->query('disease'),
            'crop' => $request->query('crop'),
            'expert_id' => $request->query('expert_id'),
            'priority_level' => $request->query('priority_level'),
            'validation_status' => $request->query('validation_status'),
        ];
    }
}
