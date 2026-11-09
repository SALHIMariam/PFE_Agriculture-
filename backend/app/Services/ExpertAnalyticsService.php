<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ExpertAnalyticsService
{
    /**
     * Applique le scope de rôle + les filtres communs à une requête sur
     * `analyses`. Un expert ne voit que ses propres analyses (expert_id
     * forcé), un admin voit tout sauf s'il précise ?expert_id=.
     *
     * Public : réutilisé tel quel par ExpertIntelligenceService (Layer 2)
     * pour ne jamais dupliquer la logique de scope/filtrage.
     */
    public function scopedQuery(User $user, array $filters)
    {
        $query = DB::table('analyses');

        if ($user->hasRole('admin')) {
            if (! empty($filters['expert_id'])) {
                $query->where('expert_id', $filters['expert_id']);
            }
        } else {
            $query->where('expert_id', $user->id);
        }

        if (! empty($filters['start_date'])) {
            $query->whereDate('created_at', '>=', $filters['start_date']);
        }

        if (! empty($filters['end_date'])) {
            $query->whereDate('created_at', '<=', $filters['end_date']);
        }

        if (! empty($filters['disease'])) {
            $query->where('predicted_class', $filters['disease']);
        }

        if (! empty($filters['crop'])) {
            $query->where('crop', $filters['crop']);
        }

        if (! empty($filters['priority_level'])) {
            $query->whereIn('priority_level', (array) $filters['priority_level']);
        }

        if (! empty($filters['validation_status'])) {
            $query->whereIn('validation_status', (array) $filters['validation_status']);
        }

        return $query;
    }

    private function round1(?float $value): ?float
    {
        return $value === null ? null : round($value, 1);
    }

    public function overview(User $user, array $filters): array
    {
        $agreement = $this->agreement($user, $filters);
        $corrections = $this->corrections($user, $filters);
        $responseTime = $this->responseTime($user, $filters);

        $draftBase = (clone $this->scopedQuery($user, $filters))->whereNotNull('responded_at')->count();
        $drafted = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('draft_response')
            ->whereNotNull('responded_at')
            ->count();
        $assistanceRate = $draftBase > 0 ? $this->round1(($drafted / $draftBase) * 100) : null;

        $editedBase = (clone $this->scopedQuery($user, $filters))
            ->where(function ($q) {
                $q->whereNotNull('draft_response')->orWhereNotNull('expert_response');
            })
            ->count();
        $edited = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('expert_edited_response')
            ->where('expert_edited_response', true)
            ->count();
        $editRate = $editedBase > 0 ? $this->round1(($edited / $editedBase) * 100) : null;

        $acceptedDirectly = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('draft_response')
            ->where('validation_status', 'validated')
            ->where('expert_edited_response', false)
            ->count();
        $rejectedWithDraft = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('draft_response')
            ->where('validation_status', 'rejected')
            ->count();

        return [
            'agreement_pct' => $agreement['agreement_pct'],
            'correction_rate_pct' => $corrections['global_rate_pct'],
            'ai_assistance_rate_pct' => $assistanceRate,
            'ai_assistance_breakdown' => [
                'prepared' => $drafted,
                'accepted_directly' => $acceptedDirectly,
                'modified' => $edited,
                'rejected' => $rejectedWithDraft,
            ],
            'expert_edit_rate_pct' => $editRate,
            'edit_funnel' => [
                'ai_generated' => $editedBase,
                'accepted_directly' => $acceptedDirectly,
                'edited' => $edited,
                'rejected' => $rejectedWithDraft,
            ],
            'avg_response_time_minutes' => $responseTime['avg_minutes'],
            'median_response_time_minutes' => $responseTime['median_minutes'],
            'total_cases' => (clone $this->scopedQuery($user, $filters))->count(),
            'total_responded' => (clone $this->scopedQuery($user, $filters))->whereNotNull('responded_at')->count(),
        ];
    }

    public function agreement(User $user, array $filters): array
    {
        $base = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('validation_status')
            ->where('validation_status', '!=', 'pending');

        $total = (clone $base)->count();
        $validated = (clone $base)->where('validation_status', 'validated')->count();
        $rejected = (clone $base)->where('validation_status', 'rejected')->count();

        $timeline = (clone $base)
            ->whereNotNull('expert_validated_at')
            ->select([
                DB::raw('DATE(expert_validated_at) as date'),
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'validated') as validated"),
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected"),
            ])
            ->groupBy(DB::raw('DATE(expert_validated_at)'))
            ->orderBy('date')
            ->get();

        return [
            'agreement_pct' => $total > 0 ? $this->round1(($validated / $total) * 100) : null,
            'validated_count' => $validated,
            'rejected_count' => $rejected,
            'total' => $total,
            'timeline' => $timeline,
        ];
    }

    public function corrections(User $user, array $filters): array
    {
        $total = (clone $this->scopedQuery($user, $filters))->whereNotNull('responded_at')->count();

        $globalRejected = (clone $this->scopedQuery($user, $filters))->where('validation_status', 'rejected')->count();
        $cnnCorrected = (clone $this->scopedQuery($user, $filters))->whereIn('cnn_validation_status', ['rejected', 'corrected'])->count();
        $recoCorrected = (clone $this->scopedQuery($user, $filters))->whereIn('reco_validation_status', ['rejected', 'corrected'])->count();

        $anyCorrected = (clone $this->scopedQuery($user, $filters))
            ->where(function ($q) {
                $q->where('validation_status', 'rejected')
                    ->orWhereIn('cnn_validation_status', ['rejected', 'corrected'])
                    ->orWhereIn('reco_validation_status', ['rejected', 'corrected']);
            })
            ->count();

        $timeline = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('responded_at')
            ->select([
                DB::raw('DATE(responded_at) as date'),
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'rejected' OR cnn_validation_status IN ('rejected','corrected') OR reco_validation_status IN ('rejected','corrected')) as corrected"),
                DB::raw('COUNT(*) as total'),
            ])
            ->groupBy(DB::raw('DATE(responded_at)'))
            ->orderBy('date')
            ->get();

        return [
            'global_rate_pct' => $total > 0 ? $this->round1(($anyCorrected / $total) * 100) : null,
            'diagnostic_rate_pct' => $total > 0 ? $this->round1(($cnnCorrected / $total) * 100) : null,
            'recommendation_rate_pct' => $total > 0 ? $this->round1(($recoCorrected / $total) * 100) : null,
            'global_rejected_rate_pct' => $total > 0 ? $this->round1(($globalRejected / $total) * 100) : null,
            'total' => $total,
            'timeline' => $timeline,
        ];
    }

    public function workload(User $user, array $filters): array
    {
        $isAdmin = $user->hasRole('admin');
        $assigned = (clone $this->scopedQuery($user, $filters))->count();
        $treated = (clone $this->scopedQuery($user, $filters))->whereNotNull('responded_at')->count();
        $pending = (clone $this->scopedQuery($user, $filters))
            ->where(function ($q) {
                $q->where('validation_status', 'pending')->orWhereNull('responded_at');
            })
            ->count();
        $urgent = (clone $this->scopedQuery($user, $filters))
            ->whereIn('priority_level', ['urgent', 'important'])
            ->whereNull('responded_at')
            ->count();

        $byWeekday = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('responded_at')
            ->select([
                DB::raw('EXTRACT(DOW FROM responded_at) as weekday'),
                DB::raw('COUNT(*) as count'),
            ])
            ->groupBy(DB::raw('EXTRACT(DOW FROM responded_at)'))
            ->orderBy('weekday')
            ->get();

        $byPriority = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('priority_level')
            ->select([
                'priority_level',
                DB::raw('COUNT(*) as total'),
                DB::raw('COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as treated'),
            ])
            ->groupBy('priority_level')
            ->get()
            ->map(fn ($row) => [
                'priority_level' => $row->priority_level,
                'total' => (int) $row->total,
                'treated' => (int) $row->treated,
                'treated_pct' => $row->total > 0 ? $this->round1(($row->treated / $row->total) * 100) : null,
            ]);

        $perExpert = null;
        if ($isAdmin && empty($filters['expert_id'])) {
            $perExpert = DB::table('analyses')
                ->join('users', 'users.id', '=', 'analyses.expert_id')
                ->whereNotNull('analyses.expert_id')
                ->select([
                    'analyses.expert_id',
                    'users.name as expert_name',
                    DB::raw('COUNT(*) as assigned'),
                    DB::raw('COUNT(*) FILTER (WHERE analyses.responded_at IS NOT NULL) as treated'),
                ])
                ->groupBy('analyses.expert_id', 'users.name')
                ->orderByDesc('assigned')
                ->get();
        }

        return [
            'assigned' => $assigned,
            'treated' => $treated,
            'remaining' => $assigned - $treated,
            'pending' => $pending,
            'urgent_untreated' => $urgent,
            'completion_rate_pct' => $assigned > 0 ? $this->round1(($treated / $assigned) * 100) : null,
            'by_weekday' => $byWeekday,
            'by_priority' => $byPriority,
            'by_expert' => $perExpert,
        ];
    }

    public function responseTime(User $user, array $filters): array
    {
        $base = (clone $this->scopedQuery($user, $filters))->whereNotNull('responded_at');

        $stats = (clone $base)
            ->select([
                DB::raw('AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60) as avg_minutes'),
                DB::raw('MIN(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60) as min_minutes'),
                DB::raw('MAX(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60) as max_minutes'),
                DB::raw('PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (responded_at - created_at)) / 60) as median_minutes'),
                DB::raw('COUNT(*) as total'),
            ])
            ->first();

        $timeline = (clone $base)
            ->select([
                DB::raw('DATE(responded_at) as date'),
                DB::raw('AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60) as avg_minutes'),
            ])
            ->groupBy(DB::raw('DATE(responded_at)'))
            ->orderBy('date')
            ->get()
            // PDO pgsql returns numeric aggregates as strings (e.g. "1500.0000000000000000");
            // cast here so the API always serializes avg_minutes as a JSON number.
            ->map(fn ($row) => [
                'date' => $row->date,
                'avg_minutes' => $this->round1((float) $row->avg_minutes),
            ]);

        $variationPct = null;
        if (! empty($filters['start_date']) && ! empty($filters['end_date'])) {
            $start = Carbon::parse($filters['start_date']);
            $end = Carbon::parse($filters['end_date']);
            $days = $start->diffInDays($end) + 1;

            $prevFilters = $filters;
            $prevFilters['start_date'] = $start->copy()->subDays($days)->toDateString();
            $prevFilters['end_date'] = $start->copy()->subDay()->toDateString();

            $prevAvg = (clone $this->scopedQuery($user, $prevFilters))
                ->whereNotNull('responded_at')
                ->select(DB::raw('AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 60) as avg_minutes'))
                ->first();

            if ($prevAvg && $prevAvg->avg_minutes !== null && (float) $prevAvg->avg_minutes > 0 && $stats->avg_minutes !== null) {
                $variationPct = $this->round1((((float) $stats->avg_minutes - (float) $prevAvg->avg_minutes) / (float) $prevAvg->avg_minutes) * 100);
            }
        }

        return [
            'avg_minutes' => $stats->avg_minutes !== null ? $this->round1((float) $stats->avg_minutes) : null,
            'median_minutes' => $stats->median_minutes !== null ? $this->round1((float) $stats->median_minutes) : null,
            'min_minutes' => $stats->min_minutes !== null ? $this->round1((float) $stats->min_minutes) : null,
            'max_minutes' => $stats->max_minutes !== null ? $this->round1((float) $stats->max_minutes) : null,
            'variation_pct' => $variationPct,
            'total' => (int) $stats->total,
            'timeline' => $timeline,
        ];
    }

    public function diseaseValidation(User $user, array $filters): array
    {
        $rows = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('predicted_class')
            ->whereNotNull('validation_status')
            ->where('validation_status', '!=', 'pending')
            ->select([
                'predicted_class',
                DB::raw('COUNT(*) as total'),
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'validated') as validated"),
            ])
            ->groupBy('predicted_class')
            ->orderByDesc('total')
            ->get()
            ->map(function ($row) {
                return [
                    'disease' => $row->predicted_class,
                    'total' => (int) $row->total,
                    'agreement_pct' => $row->total > 0 ? $this->round1(($row->validated / $row->total) * 100) : null,
                ];
            });

        return ['diseases' => $rows];
    }

    public function confidenceCorrection(User $user, array $filters): array
    {
        $rows = (clone $this->scopedQuery($user, $filters))
            ->whereNotNull('confidence')
            ->whereIn('validation_status', ['validated', 'rejected'])
            ->select(['id', 'confidence', 'validation_status'])
            ->limit(2000)
            ->get()
            ->map(fn ($row) => [
                'confidence' => round((float) $row->confidence * 100, 1),
                'validation_status' => $row->validation_status,
            ]);

        return ['points' => $rows];
    }

    public function contribution(User $user, array $filters): array
    {
        $base = (clone $this->scopedQuery($user, $filters))->whereNotNull('validation_status');

        $validated = (clone $base)->where('validation_status', 'validated')->count();
        $rejected = (clone $base)->where('validation_status', 'rejected')->count();
        $corrected = (clone $base)
            ->where('validation_status', 'rejected')
            ->where(function ($q) {
                $q->whereIn('cnn_validation_status', ['rejected', 'corrected'])
                    ->orWhereIn('reco_validation_status', ['rejected', 'corrected']);
            })
            ->count();

        $byDisease = (clone $base)
            ->whereNotNull('predicted_class')
            ->select([
                'predicted_class',
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'validated') as validated"),
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected"),
            ])
            ->groupBy('predicted_class')
            ->orderByDesc(DB::raw("COUNT(*)"))
            ->get();

        $byCrop = (clone $base)
            ->whereNotNull('crop')
            ->select([
                'crop',
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'validated') as validated"),
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected"),
            ])
            ->groupBy('crop')
            ->orderByDesc(DB::raw("COUNT(*)"))
            ->get();

        return [
            'validated_count' => $validated,
            'rejected_count' => $rejected,
            'corrected_count' => $corrected,
            'by_disease' => $byDisease,
            'by_crop' => $byCrop,
        ];
    }
}
