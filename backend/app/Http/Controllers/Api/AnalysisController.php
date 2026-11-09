<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\PredictionServiceException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnalysisMessageRequest;
use App\Http\Requests\StoreAnalysisRequest;
use App\Http\Requests\ValidateAnalysisRequest;
use App\Http\Resources\AnalysisMessageResource;
use App\Http\Resources\AnalysisResource;
use App\Models\Analysis;
use App\Models\AnalysisMessage;
use App\Services\NotificationService;
use App\Services\PredictionService;
use App\Services\RecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class AnalysisController extends Controller
{
    public function __construct(
        private readonly PredictionService $predictionService,
        private readonly RecommendationService $recommendationService,
        private readonly NotificationService $notificationService,
    ) {
    }

    public function store(StoreAnalysisRequest $request): JsonResponse
    {
        $user = $request->user();

        $path = $request->file('image')->store("analyses/{$user->id}", 'public');

        $analysis = Analysis::create([
            'user_id' => $user->id,
            'image_path' => $path,
            'status' => 'pending',
        ]);

        try {
            $this->predictionService->analyze($analysis);
        } catch (PredictionServiceException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 503);
        }

        $this->notificationService->notifyExpertsNewAnalysis($analysis->fresh());

        // Auto-ajout de la culture détectée au profil du farmer.
        // `crop` est dérivé de `predicted_class` par PredictionService ("Tomato__early_blight" -> "Tomato").
        if ($analysis->crop) {
            $currentCrops = $user->crops ?? [];
            if (! in_array($analysis->crop, $currentCrops, true)) {
                $user->update([
                    'crops' => array_values(array_unique([...$currentCrops, $analysis->crop])),
                ]);
            }
        }

        $governorate = auth()->user()?->governorate;

        $recommendation = $governorate
            ? $this->recommendationService->getRecommendation(
                $analysis->predicted_class,
                $governorate,
                $analysis->confidence,
            )
            : null;

        return response()->json([
            'analysis' => new AnalysisResource($analysis->fresh()),
            'recommendation' => $recommendation,
        ], 201);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $analyses = $request->user()
            ->analyses()
            ->with(['user', 'expert', 'cnnExpert', 'recoExpert'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return AnalysisResource::collection($analyses);
    }

    public function show(Analysis $analysis): JsonResponse
    {
        Gate::authorize('view', $analysis);

        $user = $analysis->user;

        $recommendation = ($user->governorate && $analysis->predicted_class && $analysis->confidence !== null)
            ? $this->recommendationService->getRecommendation(
                $analysis->predicted_class,
                $user->governorate,
                $analysis->confidence,
            )
            : null;

        return response()->json([
            'analysis' => new AnalysisResource($analysis),
            'recommendation' => $recommendation,
        ]);
    }

    public function latest(Request $request): JsonResponse
    {
        $user = $request->user();

        // Uniquement une analyse aboutie : une analyse « pending » ou « failed »
        // n'a pas de predicted_class et ne peut pas produire de recommandation.
        $analysis = $user->analyses()
            ->where('status', 'done')
            ->whereNotNull('predicted_class')
            ->orderByDesc('created_at')
            ->first();

        if (! $analysis) {
            return response()->json([
                'analysis' => null,
                'recommendation' => null,
            ]);
        }

        $recommendation = ($user->governorate && $analysis->predicted_class && $analysis->confidence !== null)
            ? $this->recommendationService->getRecommendation(
                $analysis->predicted_class,
                $user->governorate,
                $analysis->confidence,
            )
            : null;

        return response()->json([
            'analysis' => new AnalysisResource($analysis),
            'recommendation' => $recommendation,
        ]);
    }

    public function validate(ValidateAnalysisRequest $request, Analysis $analysis): JsonResponse
    {
        Gate::authorize('validate', $analysis);

        $analysis->update([
            'validation_status' => $request->validated('status'),
            'expert_comment' => $request->validated('comment'),
            'expert_id' => $request->user()->id,
            'expert_validated_at' => now(),
        ]);

        $fresh = $analysis->fresh();

        if ($fresh->validation_status === 'validated') {
            $this->notificationService->notifyFarmerValidated($fresh);
        } else {
            $this->notificationService->notifyFarmerRejected($fresh);
        }

        return response()->json([
            'analysis' => new AnalysisResource($fresh),
        ]);
    }

    public function validateCnn(ValidateAnalysisRequest $request, Analysis $analysis): JsonResponse
    {
        Gate::authorize('validate', $analysis);

        $analysis->update([
            'cnn_validation_status' => $request->validated('status'),
            'cnn_expert_comment' => $request->validated('comment'),
            'cnn_expert_id' => $request->user()->id,
            'cnn_validated_at' => now(),
        ]);

        $fresh = $analysis->fresh();
        $this->syncGlobalValidationStatus($fresh);

        if ($fresh->cnn_validation_status === 'validated') {
            $this->notificationService->notifyFarmerCnnValidated($fresh);
        } else {
            $this->notificationService->notifyFarmerCnnRejected($fresh);
        }

        return response()->json([
            'analysis' => new AnalysisResource($fresh),
        ]);
    }

    public function validateRecommendation(ValidateAnalysisRequest $request, Analysis $analysis): JsonResponse
    {
        Gate::authorize('validate', $analysis);

        $analysis->update([
            'reco_validation_status' => $request->validated('status'),
            'reco_expert_comment' => $request->validated('comment'),
            'reco_expert_id' => $request->user()->id,
            'reco_validated_at' => now(),
        ]);

        $fresh = $analysis->fresh();
        $this->syncGlobalValidationStatus($fresh);

        if ($fresh->reco_validation_status === 'validated') {
            $this->notificationService->notifyFarmerRecoValidated($fresh);
        } else {
            $this->notificationService->notifyFarmerRecoRejected($fresh);
        }

        return response()->json([
            'analysis' => new AnalysisResource($fresh),
        ]);
    }

    /**
     * Recalcule validation_status (l'axe global, utilisé par la heatmap, les
     * stats et les alertes) à partir des deux axes granulaires CNN/reco :
     * validated seulement quand les DEUX sont validated, rejected dès qu'UN
     * des deux est rejected, pending sinon.
     */
    private function syncGlobalValidationStatus(Analysis $analysis): void
    {
        $cnn = $analysis->cnn_validation_status;
        $reco = $analysis->reco_validation_status;

        if ($cnn === 'rejected' || $reco === 'rejected') {
            $analysis->validation_status = 'rejected';
        } elseif ($cnn === 'validated' && $reco === 'validated') {
            $analysis->validation_status = 'validated';
        } else {
            $analysis->validation_status = 'pending';
        }

        $analysis->save();
    }

    /**
     * Supprime une analyse (farmer propriétaire uniquement). Les messages
     * liés sont supprimés en cascade au niveau DB (cascadeOnDelete sur
     * analysis_messages.analysis_id) ; on nettoie ici les fichiers image et
     * gradcam sur le disque pour ne pas laisser d'orphelins.
     */
    public function destroy(Analysis $analysis): JsonResponse
    {
        Gate::authorize('delete', $analysis);

        if ($analysis->image_path) {
            Storage::disk('public')->delete($analysis->image_path);
        }
        if ($analysis->gradcam_path) {
            Storage::disk('public')->delete($analysis->gradcam_path);
        }

        $analysis->delete();

        return response()->json(['message' => 'Analyse supprimée avec succès']);
    }

    public function messages(Analysis $analysis): AnonymousResourceCollection
    {
        Gate::authorize('view', $analysis);

        return AnalysisMessageResource::collection($analysis->messages()->with('user')->get());
    }

    public function addMessage(StoreAnalysisMessageRequest $request, Analysis $analysis): JsonResponse
    {
        Gate::authorize('view', $analysis);

        $sender = $request->user();

        $message = $analysis->messages()->create([
            'user_id' => $sender->id,
            'message' => $request->validated('message'),
        ]);

        if ($sender->hasRole('farmer')) {
            $this->notificationService->notifyExpertNewMessage($analysis, $sender);
        } else {
            $this->notificationService->notifyFarmerExpertReply($analysis);
        }

        return response()->json([
            'message' => new AnalysisMessageResource($message->load('user')),
        ], 201);
    }

    public function updateMessage(
        StoreAnalysisMessageRequest $request,
        Analysis $analysis,
        AnalysisMessage $message
    ): JsonResponse {
        abort_if($message->analysis_id !== $analysis->id, 404);

        Gate::authorize('updateMessage', $message);

        $message->update([
            'message' => $request->validated('message'),
            'is_edited' => true,
        ]);

        return response()->json([
            'message' => new AnalysisMessageResource($message->fresh('user')),
        ]);
    }

    public function deleteMessage(Analysis $analysis, AnalysisMessage $message): JsonResponse
    {
        abort_if($message->analysis_id !== $analysis->id, 404);

        Gate::authorize('deleteMessage', $message);

        $message->softDeleteMessage();

        return response()->json([
            'message' => new AnalysisMessageResource($message->fresh('user')),
        ]);
    }
}
