<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Layer 2 — Intelligent Analytics. Ne duplique jamais les requêtes de
 * ExpertAnalyticsService (Layer 1) : réutilise son scopedQuery() (scope de
 * rôle + filtres communs) et ses agrégats déjà calculés (workload,
 * corrections) via injection.
 */
class ExpertIntelligenceService
{
    private const CACHE_TTL_SECONDS = 120;

    public function __construct(private readonly ExpertAnalyticsService $analyticsService)
    {
    }

    private function cacheKey(string $prefix, User $user, array $filters): string
    {
        return 'expert-intelligence:'.$prefix.':'.$user->id.':'.md5(json_encode($filters));
    }

    private function round1(?float $value): ?float
    {
        return $value === null ? null : round($value, 1);
    }

    public function overview(User $user, array $filters): array
    {
        return Cache::remember($this->cacheKey('overview', $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters) {
            $matrix = $this->reliabilityMatrix($user, $filters);
            $overconfidence = $this->overconfidence($user, $filters, 1, 1);
            $calibration = $this->calibration($user, $filters);
            $weakness = $this->diseaseWeakness($user, $filters);
            $learning = $this->learningOpportunities($user, $filters, 1, 1);
            $insights = $this->generateInsights($user, $filters);

            return [
                'reliability_matrix' => $matrix,
                'overconfidence_rate' => $overconfidence['overconfidence_rate'],
                'calibration_gap' => $calibration['calibration_gap'] ?? null,
                'weak_disease_count' => collect($weakness['diseases'])->where('status', 'weak')->count(),
                'learning_candidates' => $learning['summary'],
                'insights_count' => count($insights),
                'insights' => $insights,
            ];
        });
    }

    /**
     * MODULE 1 — AI Reliability Matrix : confiance IA (haute/basse) x
     * décision experte (accord/correction). Seuil = config('intelligence.confidence_threshold').
     */
    public function reliabilityMatrix(User $user, array $filters): array
    {
        return Cache::remember($this->cacheKey('reliability', $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters) {
            $threshold = (float) config('intelligence.confidence_threshold');
            $thresholdSql = sprintf('%.4f', $threshold);

            $rows = (clone $this->analyticsService->scopedQuery($user, $filters))
                ->whereIn('validation_status', ['validated', 'rejected'])
                ->whereNotNull('confidence')
                ->select([
                    DB::raw("CASE WHEN confidence >= {$thresholdSql} THEN 'high' ELSE 'low' END as confidence_level"),
                    DB::raw("CASE WHEN validation_status = 'validated' THEN 'agreement' ELSE 'correction' END as expert_decision"),
                    DB::raw('COUNT(*) as count'),
                ])
                ->groupBy('confidence_level', 'expert_decision')
                ->get();

            $total = (int) $rows->sum('count');

            $labels = [
                'high_confidence_agreement' => 'IA fiable',
                'high_confidence_correction' => 'IA trop confiante',
                'low_confidence_agreement' => 'Incertaine mais juste',
                'low_confidence_correction' => 'Cas difficile',
            ];

            $matrix = [];
            foreach ($labels as $key => $label) {
                $level = str_starts_with($key, 'high_') ? 'high' : 'low';
                $decision = str_ends_with($key, 'agreement') ? 'agreement' : 'correction';
                $count = (int) ($rows->first(fn ($r) => $r->confidence_level === $level && $r->expert_decision === $decision)->count ?? 0);

                $matrix[$key] = [
                    'count' => $count,
                    'pct' => $total > 0 ? $this->round1(($count / $total) * 100) : null,
                    'label' => $label,
                ];
            }

            return [
                'matrix' => $matrix,
                'total' => $total,
                'confidence_threshold' => $threshold,
            ];
        });
    }

    /**
     * MODULE 2 — AI Overconfidence Detection : prédictions à confiance >=
     * overconfidence_threshold rejetées par l'expert. Liste paginée
     * (manuellement, sur une collection déjà triée — évite de dupliquer une
     * requête COUNT juste pour LengthAwarePaginator).
     */
    public function overconfidence(User $user, array $filters, int $page = 1, int $perPage = 15): array
    {
        return Cache::remember($this->cacheKey("overconfidence:p{$page}", $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters, $page, $perPage) {
            $threshold = (float) config('intelligence.overconfidence_threshold');

            $base = (clone $this->analyticsService->scopedQuery($user, $filters))
                ->whereNotNull('confidence')
                ->where('confidence', '>=', $threshold)
                ->whereIn('validation_status', ['validated', 'rejected']);

            $highConfidenceCases = (clone $base)->count();
            $highConfidenceErrors = (clone $base)->where('validation_status', 'rejected')->count();

            $cases = (clone $base)
                ->where('validation_status', 'rejected')
                ->select(['id', 'predicted_class', 'crop', 'confidence', 'validation_status', 'expert_comment', 'priority_level', 'created_at'])
                ->orderByDesc('confidence')
                ->limit(1000)
                ->get()
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'predicted_class' => $row->predicted_class,
                    'crop' => $row->crop,
                    'confidence' => round((float) $row->confidence * 100, 1),
                    'validation_status' => $row->validation_status,
                    'expert_comment' => $row->expert_comment,
                    'priority_level' => $row->priority_level,
                    'created_at' => Carbon::parse($row->created_at)->toISOString(),
                ]);

            return [
                'high_confidence_cases' => $highConfidenceCases,
                'high_confidence_errors' => $highConfidenceErrors,
                'overconfidence_rate' => $highConfidenceCases > 0 ? $this->round1(($highConfidenceErrors / $highConfidenceCases) * 100) : null,
                'threshold' => $threshold,
                'cases' => $cases->forPage($page, $perPage)->values(),
                'total_cases' => $cases->count(),
                'page' => $page,
                'per_page' => $perPage,
            ];
        });
    }

    /**
     * MODULE 3 — AI Confidence Calibration : buckets de confiance vs taux
     * d'accord réel. calibration_gap = moyenne, pondérée par la taille de
     * chaque bucket, de |midpoint_bucket - agreement_pct(bucket)|. Un
     * modèle parfaitement calibré aurait gap ≈ 0. Retourne null si moins de
     * 5 buckets ont des données (métrique non significative).
     */
    public function calibration(User $user, array $filters): array
    {
        return Cache::remember($this->cacheKey('calibration', $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters) {
            $rows = (clone $this->analyticsService->scopedQuery($user, $filters))
                ->whereIn('validation_status', ['validated', 'rejected'])
                ->whereNotNull('confidence')
                ->select([
                    DB::raw("CASE
                        WHEN confidence < 0.5 THEN '0-50'
                        WHEN confidence < 0.6 THEN '50-60'
                        WHEN confidence < 0.7 THEN '60-70'
                        WHEN confidence < 0.8 THEN '70-80'
                        WHEN confidence < 0.9 THEN '80-90'
                        ELSE '90-100'
                    END as bucket"),
                    DB::raw('COUNT(*) as total'),
                    DB::raw("COUNT(*) FILTER (WHERE validation_status = 'validated') as agreed"),
                    DB::raw("COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected"),
                ])
                ->groupBy('bucket')
                ->get()
                ->keyBy('bucket');

            $midpoints = ['0-50' => 25, '50-60' => 55, '60-70' => 65, '70-80' => 75, '80-90' => 85, '90-100' => 95];

            $buckets = [];
            $weightedGapSum = 0.0;
            $totalWeight = 0;

            foreach ($midpoints as $range => $midpoint) {
                $row = $rows->get($range);
                if (! $row || (int) $row->total === 0) {
                    continue;
                }

                $total = (int) $row->total;
                $agreementPct = round(($row->agreed / $total) * 100, 1);

                $buckets[] = [
                    'range' => $range,
                    'total' => $total,
                    'agreement_count' => (int) $row->agreed,
                    'agreement_pct' => $agreementPct,
                    'rejection_pct' => round(($row->rejected / $total) * 100, 1),
                ];

                $weightedGapSum += abs($midpoint - $agreementPct) * $total;
                $totalWeight += $total;
            }

            $result = ['buckets' => $buckets];

            if (count($buckets) >= 5 && $totalWeight > 0) {
                $result['calibration_gap'] = $this->round1($weightedGapSum / $totalWeight);
            } else {
                $result['calibration_gap'] = null;
                $result['note'] = 'Données insuffisantes pour calculer la calibration';
            }

            return $result;
        });
    }

    /**
     * MODULE 4 — Disease AI Weakness Detection. status dérivé de
     * l'écart entre agreement_rate de la maladie et la moyenne globale
     * (global_avg_agreement) : < -15pts = weak, < -5pts = moderate, sinon
     * strong. En dessous de min_sample_size, aucun verdict ("insufficient_data").
     */
    public function diseaseWeakness(User $user, array $filters): array
    {
        return Cache::remember($this->cacheKey('weakness', $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters) {
            $minSample = (int) config('intelligence.min_sample_size');
            $threshold = (float) config('intelligence.overconfidence_threshold');
            $thresholdSql = sprintf('%.4f', $threshold);

            $rows = (clone $this->analyticsService->scopedQuery($user, $filters))
                ->whereNotNull('predicted_class')
                ->whereIn('validation_status', ['validated', 'rejected'])
                ->select([
                    'predicted_class',
                    'crop',
                    DB::raw('COUNT(*) as total'),
                    DB::raw('AVG(confidence) as avg_confidence'),
                    DB::raw("COUNT(*) FILTER (WHERE validation_status = 'validated') as validated"),
                    DB::raw("COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected"),
                    DB::raw("COUNT(*) FILTER (WHERE validation_status = 'validated' AND (cnn_validation_status IN ('rejected','corrected') OR reco_validation_status IN ('rejected','corrected'))) as corrected_within_validated"),
                    DB::raw("COUNT(*) FILTER (WHERE confidence >= {$thresholdSql}) as high_conf_total"),
                    DB::raw("COUNT(*) FILTER (WHERE confidence >= {$thresholdSql} AND validation_status = 'rejected') as high_conf_errors"),
                ])
                ->groupBy('predicted_class', 'crop')
                ->get();

            $totalAll = (int) $rows->sum('total');
            $totalValidated = (int) $rows->sum('validated');
            $globalAvgAgreement = $totalAll > 0 ? $this->round1(($totalValidated / $totalAll) * 100) : null;

            $diseases = $rows->map(function ($row) use ($minSample, $globalAvgAgreement) {
                $total = (int) $row->total;
                $sufficient = $total >= $minSample;
                $agreementRate = $total > 0 ? $this->round1(($row->validated / $total) * 100) : null;
                $correctionRate = $total > 0 ? $this->round1(($row->corrected_within_validated / $total) * 100) : null;
                $rejectionRate = $total > 0 ? $this->round1(($row->rejected / $total) * 100) : null;
                $highConfErrorRate = $row->high_conf_total > 0 ? $this->round1(($row->high_conf_errors / $row->high_conf_total) * 100) : null;

                if (! $sufficient) {
                    $status = 'insufficient_data';
                } elseif ($globalAvgAgreement !== null && $agreementRate !== null && $agreementRate < $globalAvgAgreement - 15) {
                    $status = 'weak';
                } elseif ($globalAvgAgreement !== null && $agreementRate !== null && $agreementRate < $globalAvgAgreement - 5) {
                    $status = 'moderate';
                } else {
                    $status = 'strong';
                }

                return [
                    'predicted_class' => $row->predicted_class,
                    'crop' => $row->crop,
                    'disease_name' => Str::contains((string) $row->predicted_class, '__')
                        ? Str::after((string) $row->predicted_class, '__')
                        : $row->predicted_class,
                    'total_cases' => $total,
                    'avg_confidence' => $row->avg_confidence !== null ? $this->round1((float) $row->avg_confidence * 100) : null,
                    'agreement_rate' => $agreementRate,
                    'correction_rate' => $correctionRate,
                    'rejection_rate' => $rejectionRate,
                    'high_confidence_error_rate' => $highConfErrorRate,
                    'sample_size_sufficient' => $sufficient,
                    'status' => $status,
                ];
            })->sortBy(fn ($d) => $d['agreement_rate'] ?? 100)->values();

            return [
                'diseases' => $diseases,
                'global_avg_agreement' => $globalAvgAgreement,
                'min_sample_size' => $minSample,
            ];
        });
    }

    /**
     * MODULE 5 — Smart Expert Attention Score (/100), formule documentée
     * dans computeAttentionScore(). N'automatise aucune décision : sert
     * uniquement à trier la file d'attente.
     */
    public function attentionQueue(User $user, array $filters, int $page = 1, int $perPage = 20): array
    {
        return Cache::remember($this->cacheKey("attention:p{$page}", $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters, $page, $perPage) {
            $pendingRows = (clone $this->analyticsService->scopedQuery($user, $filters))
                ->where(function ($q) {
                    $q->where('validation_status', 'pending')->orWhereNull('responded_at');
                })
                ->select(['id', 'predicted_class', 'crop', 'confidence', 'priority_level', 'created_at'])
                ->orderBy('created_at')
                ->limit(500)
                ->get();

            $totalPending = $pendingRows->count();

            if ($totalPending === 0) {
                return ['queue' => [], 'total_pending' => 0, 'page' => $page, 'per_page' => $perPage];
            }

            $rejectionRates = $this->diseaseRejectionMap($user, $filters);
            $overconfidencePatterns = $this->diseaseOverconfidencePatterns($user, $filters);
            $now = Carbon::now();

            $scored = $pendingRows->map(function ($row) use ($rejectionRates, $overconfidencePatterns, $now) {
                [$score, $reasons] = $this->computeAttentionScore($row, $rejectionRates, $overconfidencePatterns, $now);
                $hoursWaiting = abs($now->diffInMinutes(Carbon::parse($row->created_at))) / 60;

                return [
                    'analysis_id' => $row->id,
                    'predicted_class' => $row->predicted_class,
                    'crop' => $row->crop,
                    'confidence' => $row->confidence !== null ? round((float) $row->confidence * 100, 1) : null,
                    'priority_level' => $row->priority_level,
                    'attention_score' => $score,
                    'reasons' => $reasons,
                    'created_at' => Carbon::parse($row->created_at)->toISOString(),
                    'hours_waiting' => round($hoursWaiting, 1),
                ];
            })->sortByDesc('attention_score')->values();

            return [
                'queue' => $scored->forPage($page, $perPage)->values(),
                'total_pending' => $totalPending,
                'page' => $page,
                'per_page' => $perPage,
            ];
        });
    }

    /** predicted_class => taux de rejet historique (0..1) parmi les cas déjà tranchés. */
    private function diseaseRejectionMap(User $user, array $filters): Collection
    {
        return (clone $this->analyticsService->scopedQuery($user, $filters))
            ->whereNotNull('predicted_class')
            ->whereIn('validation_status', ['validated', 'rejected'])
            ->select([
                'predicted_class',
                DB::raw('COUNT(*) as total'),
                DB::raw("COUNT(*) FILTER (WHERE validation_status = 'rejected') as rejected"),
            ])
            ->groupBy('predicted_class')
            ->get()
            ->keyBy('predicted_class')
            ->map(fn ($row) => $row->total > 0 ? $row->rejected / $row->total : 0.0);
    }

    /** Ensemble des predicted_class dont high_confidence_error_rate > 10% (module 4). */
    private function diseaseOverconfidencePatterns(User $user, array $filters): array
    {
        $weakness = $this->diseaseWeakness($user, $filters);

        return collect($weakness['diseases'])
            ->filter(fn ($d) => $d['high_confidence_error_rate'] !== null && $d['high_confidence_error_rate'] > 10)
            ->pluck('predicted_class')
            ->flip()
            ->all();
    }

    /**
     * Formule du score d'attention (documentée ici, cf. prompt Layer 2) :
     *  1. Priority level         : urgent +30 / important +20 / normal +5
     *  2. AI uncertainty         : (1 - confidence) * 25
     *  3. Historical disagreement: taux de rejet de la maladie >30% +20, >15% +12, sinon +3
     *  4. Waiting time           : >24h +15, >6h +10, >1h +5, sinon +0
     *  5. Overconfidence pattern : +10 si la maladie a un high_confidence_error_rate > 10%
     * Total clampé entre 0 et 100.
     *
     * @return array{0: int, 1: string[]}
     */
    private function computeAttentionScore(object $row, Collection $rejectionRates, array $overconfidencePatterns, Carbon $now): array
    {
        $score = 0;
        $reasons = [];

        $priority = $row->priority_level;
        if ($priority === 'urgent') {
            $score += 30;
            $reasons[] = 'Priorité urgente (+30)';
        } elseif ($priority === 'important') {
            $score += 20;
            $reasons[] = 'Priorité importante (+20)';
        } else {
            $score += 5;
            $reasons[] = 'Priorité normale (+5)';
        }

        if ($row->confidence !== null) {
            $confidence = (float) $row->confidence;
            $uncertaintyPoints = (int) round((1 - $confidence) * 25);
            $score += $uncertaintyPoints;
            $reasons[] = 'Confiance de l’IA : '.round($confidence * 100, 1)." % (incertitude +{$uncertaintyPoints})";
        }

        $rejectionRate = $rejectionRates->get($row->predicted_class, 0.0);
        if ($rejectionRate > 0.3) {
            $score += 20;
            $reasons[] = 'Maladie souvent contestée par les experts : '.round($rejectionRate * 100).' % de désaccord (+20)';
        } elseif ($rejectionRate > 0.15) {
            $score += 12;
            $reasons[] = 'Maladie parfois contestée par les experts : '.round($rejectionRate * 100).' % de désaccord (+12)';
        } else {
            $score += 3;
            $reasons[] = 'Maladie rarement contestée par les experts (+3)';
        }

        $hoursWaiting = abs($now->diffInMinutes(Carbon::parse($row->created_at))) / 60;
        if ($hoursWaiting > 24) {
            $score += 15;
            $reasons[] = 'En attente depuis '.round($hoursWaiting).' h (+15)';
        } elseif ($hoursWaiting > 6) {
            $score += 10;
            $reasons[] = 'En attente depuis '.round($hoursWaiting).' h (+10)';
        } elseif ($hoursWaiting > 1) {
            $score += 5;
            $reasons[] = 'En attente depuis '.round($hoursWaiting).' h (+5)';
        } else {
            $reasons[] = 'En attente depuis '.round($hoursWaiting * 60).' min (+0)';
        }

        if (isset($overconfidencePatterns[$row->predicted_class])) {
            $score += 10;
            $reasons[] = 'L’IA est souvent trop confiante sur cette maladie (+10)';
        }

        return [min(100, max(0, $score)), $reasons];
    }

    /**
     * MODULE 6 — AI Learning Opportunities. Candidats = cas rejetés par
     * l'expert, classés par valeur pour un futur fine-tuning (jamais
     * "réentraîné" / "accuracy improved" — uniquement "candidate").
     */
    public function learningOpportunities(User $user, array $filters, int $page = 1, int $perPage = 20, ?string $priority = null): array
    {
        $priority = in_array($priority, ['high', 'medium', 'low'], true) ? $priority : null;

        return Cache::remember($this->cacheKey("learning:p{$page}:".($priority ?? 'all'), $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters, $page, $perPage, $priority) {
            $overThreshold = (float) config('intelligence.overconfidence_threshold');
            $midThreshold = (float) config('intelligence.confidence_threshold');

            $weakness = $this->diseaseWeakness($user, $filters);
            $agreementByDisease = collect($weakness['diseases'])->keyBy('predicted_class');

            $rows = (clone $this->analyticsService->scopedQuery($user, $filters))
                ->where('validation_status', 'rejected')
                ->select(['id', 'predicted_class', 'crop', 'confidence', 'validation_status', 'expert_comment', 'created_at'])
                ->orderByDesc('confidence')
                ->limit(1000)
                ->get();

            $candidates = $rows->map(function ($row) use ($agreementByDisease, $overThreshold, $midThreshold) {
                $confidence = $row->confidence !== null ? (float) $row->confidence : 0.0;
                $diseaseAgreement = $agreementByDisease->get($row->predicted_class)['agreement_rate'] ?? null;

                $isHighConfReject = $confidence >= $overThreshold;
                $isWeakDisease = $diseaseAgreement !== null && $diseaseAgreement < 60;
                $isModConfReject = $confidence >= $midThreshold;
                $isModWeakDisease = $diseaseAgreement !== null && $diseaseAgreement < 75;

                if ($isHighConfReject || $isWeakDisease) {
                    $priority = 'high';
                } elseif ($isModConfReject || $isModWeakDisease) {
                    $priority = 'medium';
                } else {
                    $priority = 'low';
                }

                $reasons = [];
                if ($isHighConfReject) {
                    $reasons[] = 'Forte confiance ('.round($confidence * 100).' %) mais rejetée par l’expert';
                } elseif ($isModConfReject) {
                    $reasons[] = 'Confiance moyenne à élevée ('.round($confidence * 100).' %) mais rejetée par l’expert';
                }
                if ($isWeakDisease) {
                    $reasons[] = 'Maladie souvent contestée ('.$this->round1(100 - $diseaseAgreement).' % de désaccord)';
                } elseif ($isModWeakDisease) {
                    $reasons[] = 'Maladie parfois contestée';
                }
                if (empty($reasons)) {
                    $reasons[] = 'L’expert a rejeté cette prédiction de l’IA';
                }

                return [
                    'analysis_id' => $row->id,
                    'predicted_class' => $row->predicted_class,
                    'crop' => $row->crop,
                    'confidence' => round($confidence * 100, 1),
                    'validation_status' => $row->validation_status,
                    'expert_comment' => $row->expert_comment,
                    'learning_priority' => $priority,
                    'reasons' => $reasons,
                    'created_at' => Carbon::parse($row->created_at)->toISOString(),
                ];
            });

            $priorityOrder = ['high' => 0, 'medium' => 1, 'low' => 2];
            $sorted = $candidates->sortBy(fn ($c) => $priorityOrder[$c['learning_priority']])->values();

            // Summary always reflects the full unfiltered set, regardless of $priority.
            $summary = [
                'total_candidates' => $sorted->count(),
                'high_value' => $sorted->where('learning_priority', 'high')->count(),
                'medium_value' => $sorted->where('learning_priority', 'medium')->count(),
                'low_value' => $sorted->where('learning_priority', 'low')->count(),
            ];

            // Filter BEFORE paginating, otherwise a given page may contain zero
            // candidates of the requested priority even though the total count is > 0
            // (candidates are sorted high -> medium -> low, so e.g. "low" items only
            // start appearing many pages in).
            $scoped = $priority !== null ? $sorted->where('learning_priority', $priority)->values() : $sorted;

            return [
                'summary' => $summary,
                'candidates' => $scoped->forPage($page, $perPage)->values(),
                'total' => $scoped->count(),
                'page' => $page,
                'per_page' => $perPage,
            ];
        });
    }

    /**
     * MODULE 7 — AI Generated Insights. Moteur de règles, 100% dynamique :
     * aucun texte statique, chaque insight dérive des modules 1-6 et des
     * agrégats Layer 1 (workload, corrections).
     */
    public function insights(User $user, array $filters): array
    {
        return Cache::remember($this->cacheKey('insights', $user, $filters), self::CACHE_TTL_SECONDS, function () use ($user, $filters) {
            return ['insights' => $this->generateInsights($user, $filters)];
        });
    }

    private function generateInsights(User $user, array $filters): array
    {
        $insights = [];

        $overconfidence = $this->overconfidence($user, $filters, 1, 1);
        if ($overconfidence['overconfidence_rate'] !== null && $overconfidence['overconfidence_rate'] > 5) {
            $insights[] = [
                'type' => 'overconfidence',
                'severity' => $overconfidence['overconfidence_rate'] > 15 ? 'critical' : 'warning',
                'icon' => 'warning',
                'title' => 'Excès de confiance de l’IA détecté',
                'message' => "{$overconfidence['overconfidence_rate']} % des prédictions à forte confiance (> ".round(((float) config('intelligence.overconfidence_threshold')) * 100)." %) ont été corrigées par les experts.",
                'metric' => 'overconfidence_rate',
                'value' => $overconfidence['overconfidence_rate'],
                'recommendation' => 'Examinez les corrections à forte confiance et envisagez d’ajouter des cas représentatifs au prochain jeu de données d’affinage.',
            ];
        }

        $weakness = $this->diseaseWeakness($user, $filters);
        $weakDiseases = collect($weakness['diseases'])->where('status', 'weak');
        if ($weakDiseases->isNotEmpty()) {
            $names = $weakDiseases->pluck('disease_name')->take(3)->implode(', ');
            $insights[] = [
                'type' => 'disease_weakness',
                'severity' => 'warning',
                'icon' => 'alert',
                'title' => 'L’IA peine sur certaines maladies',
                'message' => "{$names} : taux d’accord nettement inférieur à la moyenne. {$weakDiseases->count()} maladie(s) signalée(s).",
                'metric' => 'weak_disease_count',
                'value' => $weakDiseases->count(),
                'recommendation' => 'Faites examiner ces maladies en priorité par les experts et collectez davantage d’exemples d’entraînement.',
            ];
        }

        $workload = $this->analyticsService->workload($user, $filters);
        if ($workload['urgent_untreated'] > 0) {
            $insights[] = [
                'type' => 'workload_pressure',
                'severity' => $workload['urgent_untreated'] > 5 ? 'critical' : 'info',
                'icon' => 'clock',
                'title' => 'Cas urgents en attente d’examen',
                'message' => "{$workload['urgent_untreated']} cas urgent(s) toujours en attente d’examen par un expert.",
                'metric' => 'urgent_untreated',
                'value' => $workload['urgent_untreated'],
                'recommendation' => 'Consultez la file intelligente pour traiter les cas urgents en priorité.',
            ];
        }

        $calibration = $this->calibration($user, $filters);
        if (($calibration['calibration_gap'] ?? null) !== null && $calibration['calibration_gap'] > 10) {
            $insights[] = [
                'type' => 'calibration',
                'severity' => 'info',
                'icon' => 'chart',
                'title' => 'Écart de calibration de la confiance de l’IA',
                'message' => "La confiance du modèle ne reflète pas bien l’accord des experts (écart : {$calibration['calibration_gap']} %).",
                'metric' => 'calibration_gap',
                'value' => $calibration['calibration_gap'],
                'recommendation' => 'Le modèle pourrait bénéficier d’une technique de calibration (temperature scaling) lors d’un prochain entraînement.',
            ];
        }

        $learning = $this->learningOpportunities($user, $filters, 1, 1);
        if ($learning['summary']['high_value'] > 0) {
            $insights[] = [
                'type' => 'learning',
                'severity' => 'info',
                'icon' => 'brain',
                'title' => 'Opportunités d’apprentissage pour l’IA',
                'message' => "{$learning['summary']['high_value']} correction(s) à forte valeur pourraient améliorer le modèle si elles servaient à l’affinage.",
                'metric' => 'high_value_candidates',
                'value' => $learning['summary']['high_value'],
                'recommendation' => 'Exportez ces cas pour que l’équipe data science les examine.',
            ];
        }

        $corrections = $this->analyticsService->corrections($user, $filters);
        if ($corrections['global_rate_pct'] !== null && $corrections['global_rate_pct'] > 25) {
            $insights[] = [
                'type' => 'correction_trend',
                'severity' => 'warning',
                'icon' => 'trend',
                'title' => 'Taux de correction élevé',
                'message' => "Les experts ont corrigé {$corrections['global_rate_pct']} % des prédictions de l’IA sur la période sélectionnée.",
                'metric' => 'correction_rate',
                'value' => $corrections['global_rate_pct'],
                'recommendation' => 'Envisagez de vérifier le jeu d’entraînement (biais, décalage de distribution).',
            ];
        }

        return $insights;
    }
}
