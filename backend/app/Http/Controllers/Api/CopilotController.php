<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnalysisResource;
use App\Models\Analysis;
use App\Services\CopilotService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CopilotController extends Controller
{
    public function __construct(
        private readonly CopilotService $copilotService,
        private readonly NotificationService $notificationService,
    ) {
    }

    /**
     * GET /api/copilot/queue?sort=priority|recent — analyses en attente
     * (mêmes conventions de sérialisation que ExpertAnalysisController::index
     * — AnalysisResource::collection). Tri par priorité décroissante par
     * défaut, ou par date de soumission décroissante avec ?sort=recent.
     *
     * Filtres optionnels : ?search= (farmer, gouvernorat, plante/maladie),
     * ?governorate= (exact), ?severity= (priority_level), ?status=
     * (pending|validated|edited|rejected|all — cf. les tiles de stats).
     */
    public function queue(Request $request): AnonymousResourceCollection
    {
        $sort = $request->query('sort', 'priority');
        $search = $request->query('search');
        $governorate = $request->query('governorate');
        $severity = $request->query('severity');
        $status = $request->query('status', 'pending');

        $query = Analysis::whereNotNull('draft_response')
            ->with(['user', 'expert', 'cnnExpert', 'recoExpert']);

        switch ($status) {
            case 'validated':
                $query->where('validation_status', 'validated')
                    ->where('expert_edited_response', false);
                break;
            case 'edited':
                $query->where('validation_status', 'validated')
                    ->where('expert_edited_response', true);
                break;
            case 'rejected':
                $query->where('validation_status', 'rejected');
                break;
            case 'all':
                break;
            case 'pending':
            default:
                $query->where('validation_status', 'pending')
                    ->where('cnn_validation_status', 'pending')
                    ->where('reco_validation_status', 'pending');
                break;
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('predicted_class', 'ilike', "%{$search}%")
                    ->orWhere('crop', 'ilike', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('governorate', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($governorate) {
            $query->whereHas('user', fn ($q) => $q->where('governorate', $governorate));
        }

        if ($severity) {
            $query->where('priority_level', $severity);
        }

        if ($sort === 'recent') {
            $query->orderByDesc('created_at');
        } else {
            $query->orderByRaw('priority_score IS NULL, priority_score DESC');
        }

        return AnalysisResource::collection($query->paginate(20));
    }

    /** GET /api/copilot/prepare/{analysis} — prépare (ou relit) le brouillon Assistant AI. */
    public function prepare(Analysis $analysis): JsonResponse
    {
        try {
            $result = $this->copilotService->prepare($analysis);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }

        return response()->json($result);
    }

    /**
     * GET /api/copilot/batches — groupes d'analyses en attente (même maladie
     * + même gouvernorat) de 3 cas ou plus, pour repérer les foyers.
     */
    public function batches(): JsonResponse
    {
        $batches = DB::table('analyses')
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->where('analyses.validation_status', 'pending')
            ->where('analyses.cnn_validation_status', 'pending')
            ->where('analyses.reco_validation_status', 'pending')
            ->whereNotNull('analyses.predicted_class')
            ->whereNotNull('users.governorate')
            ->groupBy('analyses.predicted_class', 'users.governorate')
            ->havingRaw('COUNT(*) >= 3')
            ->select([
                'analyses.predicted_class as disease',
                'users.governorate as governorate',
                DB::raw('COUNT(*) as count'),
                DB::raw('AVG(analyses.confidence) as avg_confidence'),
                DB::raw('MAX(analyses.priority_score) as max_priority'),
            ])
            ->orderByDesc('max_priority')
            ->get();

        return response()->json(['batches' => $batches]);
    }

    /** POST /api/copilot/{analysis}/respond — valide / édite / rejette le brouillon. */
    public function respond(Analysis $analysis, Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:validate,edit,reject'],
            'response' => ['nullable', 'string', 'max:5000', 'required_if:action,edit'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        switch ($data['action']) {
            case 'validate':
                $analysis->validation_status = 'validated';
                $analysis->expert_response = $analysis->draft_response;
                $analysis->cnn_validation_status = 'validated';
                $analysis->cnn_expert_id = auth()->id();
                $analysis->cnn_validated_at = now();
                $analysis->reco_validation_status = 'validated';
                $analysis->reco_expert_id = auth()->id();
                $analysis->reco_validated_at = now();
                break;
            case 'edit':
                $analysis->validation_status = 'validated';
                $analysis->expert_edited_response = true;
                $analysis->expert_response = $data['response'];
                $analysis->cnn_validation_status = 'validated';
                $analysis->cnn_expert_id = auth()->id();
                $analysis->cnn_validated_at = now();
                $analysis->reco_validation_status = 'validated';
                $analysis->reco_expert_id = auth()->id();
                $analysis->reco_validated_at = now();
                break;
            case 'reject':
                $analysis->validation_status = 'rejected';
                $analysis->cnn_validation_status = 'rejected';
                $analysis->cnn_expert_id = auth()->id();
                $analysis->cnn_validated_at = now();
                $analysis->reco_validation_status = 'rejected';
                $analysis->reco_expert_id = auth()->id();
                $analysis->reco_validated_at = now();
                // Stocker le commentaire de rejet dans expert_comment et expert_response
                if (!empty($data['comment'])) {
                    $analysis->expert_comment = $data['comment'];
                    $analysis->expert_response = $data['comment'];
                }
                break;
        }

        $analysis->expert_id = auth()->id();
        $analysis->expert_validated_at = now();
        $analysis->responded_at = now();
        $analysis->save();

        // Faire apparaître la réponse de l'expert dans la Discussion du farmer,
        // avec la même notification que le fil de messages existant.
        if (in_array($data['action'], ['validate', 'edit'], true) && $analysis->expert_response) {
            $analysis->messages()->create([
                'user_id' => auth()->id(),
                'message' => $analysis->expert_response,
            ]);
            $this->notificationService->notifyFarmerExpertReply($analysis);
        } elseif ($data['action'] === 'reject' && !empty($data['comment'])) {
            $analysis->messages()->create([
                'user_id' => auth()->id(),
                'message' => $data['comment'],
            ]);
            $this->notificationService->notifyFarmerExpertReply($analysis);
        }

        return response()->json(['analysis' => $analysis->fresh()]);
    }

    /**
     * POST /api/copilot/{analysis}/revise
     * Modifier le résultat d'une validation déjà faite (changer validé→rejeté
     * ou rejeté→validé). Envoie une notification au farmer.
     */
    public function revise(Analysis $analysis, Request $request): JsonResponse
    {
        $data = $request->validate([
            'new_status' => ['required', 'in:validated,rejected'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $oldStatus = $analysis->validation_status;
        $newStatus = $data['new_status'];

        // Ne rien faire si le statut est le même
        if ($oldStatus === $newStatus) {
            return response()->json([
                'message' => 'Le statut est déjà '.$newStatus,
            ], 422);
        }

        // Mettre à jour les 3 statuts
        $analysis->validation_status = $newStatus;
        $analysis->cnn_validation_status = $newStatus;
        $analysis->cnn_expert_id = auth()->id();
        $analysis->cnn_validated_at = now();
        $analysis->reco_validation_status = $newStatus;
        $analysis->reco_expert_id = auth()->id();
        $analysis->reco_validated_at = now();
        $analysis->expert_id = auth()->id();
        $analysis->expert_validated_at = now();
        $analysis->responded_at = now();

        if ($newStatus === 'rejected') {
            $analysis->expert_comment = $data['comment'] ?? null;
            $analysis->expert_response = $data['comment'] ?? null;
        } elseif ($newStatus === 'validated') {
            // Si on revalide, utiliser le brouillon existant ou le commentaire
            $analysis->expert_response = $data['comment'] ?? $analysis->draft_response;
            $analysis->expert_edited_response = !empty($data['comment']);
            $analysis->expert_comment = null;
        }

        $analysis->save();

        // Envoyer un message dans la Discussion si un commentaire est fourni
        $farmer = $analysis->user;
        $messageBody = null;

        if ($newStatus === 'validated' && !empty($data['comment'])) {
            $messageBody = $data['comment'];
        } elseif ($newStatus === 'validated' && $analysis->draft_response) {
            $messageBody = $analysis->draft_response;
        } elseif ($newStatus === 'rejected' && !empty($data['comment'])) {
            $messageBody = $data['comment'];
        }

        if ($messageBody && $farmer) {
            $analysis->messages()->create([
                'user_id' => auth()->id(),
                'message' => '[Modification] '.$messageBody,
            ]);

            $this->notificationService->notifyFarmerExpertReply($analysis);
        }

        return response()->json(['analysis' => $analysis->fresh()]);
    }

    /** GET /api/copilot/stats — taux d'acceptation des brouillons Assistant AI. */
    public function stats(): JsonResponse
    {
        $prepared = Analysis::whereNotNull('draft_response');

        $total = (clone $prepared)->count();
        $validatedDirectly = (clone $prepared)
            ->where('validation_status', 'validated')
            ->where('expert_edited_response', false)
            ->count();
        $editedByExpert = (clone $prepared)
            ->where('validation_status', 'validated')
            ->where('expert_edited_response', true)
            ->count();
        $rejected = (clone $prepared)->where('validation_status', 'rejected')->count();
        $pending = (clone $prepared)
            ->where('validation_status', 'pending')
            ->where('cnn_validation_status', 'pending')
            ->where('reco_validation_status', 'pending')
            ->count();

        $responded = $validatedDirectly + $editedByExpert + $rejected;

        return response()->json([
            'total_prepared' => $total,
            'validated_directly' => $validatedDirectly,
            'edited_by_expert' => $editedByExpert,
            'rejected' => $rejected,
            'pending' => $pending,
            'acceptance_rate' => $responded > 0
                ? round((($validatedDirectly + $editedByExpert) / $responded) * 100, 1)
                : null,
            'direct_accept_rate' => $responded > 0
                ? round(($validatedDirectly / $responded) * 100, 1)
                : null,
        ]);
    }

    /**
     * GET /api/copilot/daily-stats?from=2026-09-01&to=2026-09-30
     * Statistiques quotidiennes des actions Copilot (validées + rejetées),
     * pour affichage dans le calendrier.
     */
    public function dailyStats(Request $request): JsonResponse
    {
        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to = $request->query('to', now()->endOfMonth()->toDateString());

        $stats = DB::table('analyses')
            ->whereNotNull('draft_response')
            ->whereNotNull('responded_at')
            ->whereBetween('responded_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->select([
                DB::raw('DATE(responded_at) as date'),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN validation_status = 'validated' AND expert_edited_response = false THEN 1 ELSE 0 END) as validated"),
                DB::raw("SUM(CASE WHEN validation_status = 'validated' AND expert_edited_response = true THEN 1 ELSE 0 END) as edited"),
                DB::raw("SUM(CASE WHEN validation_status = 'rejected' THEN 1 ELSE 0 END) as rejected"),
            ])
            ->groupBy(DB::raw('DATE(responded_at)'))
            ->orderBy('date')
            ->get();

        // Aussi compter les analyses en attente qui ont été préparées par jour
        $prepared = DB::table('analyses')
            ->whereNotNull('draft_response')
            ->whereBetween('created_at', [$from.' 00:00:00', $to.' 23:59:59'])
            ->select([
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as prepared'),
            ])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Fusionner les deux datasets
        $result = $stats->map(function ($row) use ($prepared) {
            $row->prepared = $prepared[$row->date]->prepared ?? 0;

            return $row;
        });

        // Ajouter les jours qui ont des préparées mais pas encore de réponses
        foreach ($prepared as $date => $prepRow) {
            if (!$stats->contains('date', $date)) {
                $result->push((object) [
                    'date' => $date,
                    'total' => 0,
                    'validated' => 0,
                    'edited' => 0,
                    'rejected' => 0,
                    'prepared' => $prepRow->prepared,
                ]);
            }
        }

        return response()->json([
            'daily' => $result->sortBy('date')->values(),
        ]);
    }
}
