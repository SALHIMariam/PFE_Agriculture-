<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExpertIntelligenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpertIntelligenceController extends Controller
{
    public function __construct(private readonly ExpertIntelligenceService $intelligenceService)
    {
    }

    /** GET /api/expert-intelligence/overview */
    public function overview(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->overview($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-intelligence/reliability-matrix */
    public function reliabilityMatrix(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->reliabilityMatrix($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-intelligence/overconfidence?page= */
    public function overconfidence(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->overconfidence(
            $request->user(),
            $this->filters($request),
            (int) $request->query('page', 1),
            15
        ));
    }

    /** GET /api/expert-intelligence/calibration */
    public function calibration(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->calibration($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-intelligence/disease-weakness */
    public function diseaseWeakness(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->diseaseWeakness($request->user(), $this->filters($request)));
    }

    /** GET /api/expert-intelligence/attention-queue?page= */
    public function attentionQueue(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->attentionQueue(
            $request->user(),
            $this->filters($request),
            (int) $request->query('page', 1),
            20
        ));
    }

    /** GET /api/expert-intelligence/learning-opportunities?page=&priority= */
    public function learningOpportunities(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->learningOpportunities(
            $request->user(),
            $this->filters($request),
            (int) $request->query('page', 1),
            20,
            $request->query('priority')
        ));
    }

    /** GET /api/expert-intelligence/insights */
    public function insights(Request $request): JsonResponse
    {
        return response()->json($this->intelligenceService->insights($request->user(), $this->filters($request)));
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
