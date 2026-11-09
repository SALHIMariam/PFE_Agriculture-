<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Analysis;
use App\Support\DiseaseLabels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class StatsController extends Controller
{
    /** Colors assigned to disease-distribution segments, in order of frequency. */
    private const DISTRIBUTION_COLORS = [
        '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    ];

    /** French label + emoji for each known crop key (predicted_class prefix, lowercased). */
    private const CROP_LABELS = [
        'apple' => ['fr' => 'Pomme', 'emoji' => '🍎'],
        'bean' => ['fr' => 'Haricot', 'emoji' => '🫘'],
        'corn' => ['fr' => 'Maïs', 'emoji' => '🌽'],
        'cucumber' => ['fr' => 'Concombre', 'emoji' => '🥒'],
        'grape' => ['fr' => 'Raisin', 'emoji' => '🍇'],
        'groundnut' => ['fr' => 'Arachide', 'emoji' => '🥜'],
        'potato' => ['fr' => 'Pomme de terre', 'emoji' => '🥔'],
        'tomato' => ['fr' => 'Tomate', 'emoji' => '🍅'],
        'wheat' => ['fr' => 'Blé', 'emoji' => '🌾'],
    ];

    private function isHealthy(?string $predictedClass): bool
    {
        return $predictedClass !== null && str_contains(strtolower($predictedClass), 'healthy');
    }

    public function overview(Request $request): JsonResponse
    {
        $analyses = Analysis::where('user_id', $request->user()->id)->get();
        $total = $analyses->count();

        $healthyCount = $analyses->filter(fn ($a) => $this->isHealthy($a->predicted_class))->count();
        $cropHealthScore = $total > 0 ? (int) round($healthyCount / $total * 100) : 100;

        $withExpert = $analyses->filter(fn ($a) => $a->expert_id !== null);
        $treatmentScore = $total > 0 ? (int) round($withExpert->count() / $total * 100) : 0;

        $avgConfidence = $total > 0 ? (float) $analyses->avg('confidence') : 0.0;
        $aiAccuracyScore = max(0, min(100, (int) round($avgConfidence * 100)));

        $expertAgreementScore = $withExpert->count() > 0
            ? (int) round($withExpert->filter(fn ($a) => $a->validation_status === 'validated')->count() / $withExpert->count() * 100)
            : 0;

        $satisfactionScore = (int) round(($cropHealthScore + $treatmentScore + $aiAccuracyScore + $expertAgreementScore) / 4);

        $farmPerformanceIndex = (int) round(
            $cropHealthScore * 0.35
            + $aiAccuracyScore * 0.25
            + $treatmentScore * 0.2
            + $expertAgreementScore * 0.2
        );
        $farmPerformanceIndex = max(0, min(100, $farmPerformanceIndex));

        $performanceLabel = match (true) {
            $farmPerformanceIndex >= 80 => 'Excellent',
            $farmPerformanceIndex >= 60 => 'Bon',
            $farmPerformanceIndex >= 40 => 'Moyen',
            default => 'Faible',
        };
        $performanceStars = max(0, min(5, (int) round($farmPerformanceIndex / 20)));

        $weekStart = now()->subDays(7);
        $analysesThisWeek = $analyses->filter(fn ($a) => $a->created_at && Carbon::parse($a->created_at)->gte($weekStart))->count();

        $mostAnalysedCrop = $analyses->filter(fn ($a) => $a->crop)
            ->countBy('crop')
            ->sortDesc()
            ->keys()
            ->first();

        $diseaseDistribution = $analyses->filter(fn ($a) => ! $this->isHealthy($a->predicted_class) && $a->disease)
            ->countBy('disease')
            ->sortDesc()
            ->take(5)
            ->map(fn ($count, $disease) => ['disease' => $disease, 'count' => $count])
            ->values()
            ->all();

        $aiConclusion = $total > 0
            ? "Sur {$total} analyses, {$cropHealthScore}% de vos cultures sont en bonne santé."
            : 'Aucune analyse enregistrée pour le moment.';

        return response()->json([
            'farm_performance_index' => $farmPerformanceIndex,
            'performance_label' => $performanceLabel,
            'performance_stars' => $performanceStars,
            'crop_health_score' => $cropHealthScore,
            'treatment_score' => $treatmentScore,
            'ai_accuracy_score' => $aiAccuracyScore,
            'expert_agreement_score' => $expertAgreementScore,
            'satisfaction_score' => $satisfactionScore,
            'ai_conclusion' => $aiConclusion,
            'total_analyses' => $total,
            'analyses_this_week' => $analysesThisWeek,
            'most_analysed_crop' => $mostAnalysedCrop,
            'disease_distribution' => $diseaseDistribution,
        ]);
    }

    /**
     * GET /api/stats/farmer-dashboard — tout ce dont l'accueil du dashboard
     * farmer a besoin en un seul appel, limité aux analyses de l'utilisateur
     * connecté : KPI, analyses par mois (6 derniers mois, ventilées par
     * statut de validation), top 5 maladies, 5 dernières analyses.
     */
    public function farmerDashboard(Request $request): JsonResponse
    {
        $analyses = Analysis::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();
        $total = $analyses->count();

        $last30 = now()->subDays(30);
        $prev30 = now()->subDays(60);
        $inLast30 = $analyses->filter(fn ($a) => $a->created_at?->gte($last30))->count();
        $inPrev30 = $analyses->filter(fn ($a) => $a->created_at?->gte($prev30) && $a->created_at->lt($last30))->count();

        $healthy = $analyses->filter(fn ($a) => $this->isHealthy($a->predicted_class))->count();
        $byStatus = $analyses->countBy('validation_status');

        $monthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->startOfMonth()->subMonthsNoOverflow($i);
            $inMonth = $analyses->filter(fn ($a) => $a->created_at?->isSameMonth($month));
            $monthly[] = [
                'month' => $month->format('Y-m'),
                'validated' => $inMonth->where('validation_status', 'validated')->count(),
                'pending' => $inMonth->where('validation_status', 'pending')->count(),
                'rejected' => $inMonth->where('validation_status', 'rejected')->count(),
            ];
        }

        $diseased = $analyses->filter(fn ($a) => $a->disease && ! $this->isHealthy($a->predicted_class));
        $topDiseases = $diseased->countBy('disease')
            ->sortDesc()
            ->take(5)
            ->map(fn ($count, $disease) => [
                'disease' => DiseaseLabels::disease($disease),
                'count' => $count,
                'percentage' => $total > 0 ? round($count / $total * 100, 1) : 0.0,
            ])
            ->values()
            ->all();

        $recent = $analyses->take(5)->map(fn ($a) => [
            'id' => $a->id,
            'disease' => $this->isHealthy($a->predicted_class) ? 'Plante saine' : DiseaseLabels::disease($a->predicted_class),
            'crop' => DiseaseLabels::crop($a->crop),
            'healthy' => $this->isHealthy($a->predicted_class),
            'confidence' => $a->confidence,
            'validation_status' => $a->validation_status,
            'created_at' => $a->created_at?->toIso8601String(),
        ])->values()->all();

        return response()->json([
            'kpis' => [
                'total' => $total,
                'last_30_days' => $inLast30,
                'previous_30_days' => $inPrev30,
                'validated' => $byStatus->get('validated', 0),
                'pending' => $byStatus->get('pending', 0),
                'rejected' => $byStatus->get('rejected', 0),
                'healthy_percentage' => $total > 0 ? (int) round($healthy / $total * 100) : 0,
                'average_confidence' => $total > 0 ? round((float) $analyses->avg('confidence') * 100, 1) : 0.0,
            ],
            'monthly' => $monthly,
            'top_diseases' => $topDiseases,
            'recent' => $recent,
        ]);
    }

    public function analyses(Request $request): JsonResponse
    {
        $analyses = Analysis::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json($analyses);
    }

    public function aiSummary(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $total = Analysis::where('user_id', $userId)->count();
        $diseaseCount = Analysis::where('user_id', $userId)
            ->whereNotNull('predicted_class')
            ->where('predicted_class', 'not like', '%healthy%')
            ->count();

        $summary = $total > 0
            ? "Vous avez effectué {$total} analyses, dont {$diseaseCount} ont révélé une maladie potentielle."
            : 'Commencez à analyser vos cultures pour obtenir un résumé personnalisé.';

        return response()->json(['summary' => $summary]);
    }

    public function regionalMap(): JsonResponse
    {
        // Global (all-farmers) aggregation — cached 2 min to avoid re-scanning
        // every analysis row on each dashboard load/refresh.
        $regions = Cache::remember('stats:regional-map', 120, fn () => $this->buildRegionalMap());

        return response()->json(['regions' => $regions]);
    }

    private function buildRegionalMap(): array
    {
        $governorates = config('tunisia.governorates');

        $rows = Analysis::query()
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->whereNotNull('users.governorate')
            ->select(['analyses.predicted_class', 'analyses.crop', 'users.governorate'])
            ->get();

        $regions = [];

        foreach (array_keys($governorates) as $governorate) {
            $group = $rows->where('governorate', $governorate);
            $total = $group->count();
            $diseaseRows = $group->filter(fn ($r) => ! $this->isHealthy($r->predicted_class));
            $diseaseCount = $diseaseRows->count();
            $riskPercentage = $total > 0 ? (int) round($diseaseCount / $total * 100) : 0;

            $topDisease = $diseaseRows
                ->map(function ($r) {
                    $parts = $r->predicted_class ? explode('__', $r->predicted_class, 2) : [];

                    return $parts[1] ?? null;
                })
                ->filter()
                ->countBy()
                ->sortDesc()
                ->keys()
                ->first();

            $topCrop = $group->filter(fn ($r) => $r->crop)
                ->countBy('crop')
                ->sortDesc()
                ->keys()
                ->first();

            $regions[] = [
                'governorate' => $governorate,
                'total_analyses' => $total,
                'disease_count' => $diseaseCount,
                'healthy_count' => $total - $diseaseCount,
                'risk_percentage' => $riskPercentage,
                'top_disease' => $topDisease,
                'top_crop' => $topCrop,
            ];
        }

        return $regions;
    }

    public function diseaseDistribution(Request $request): JsonResponse
    {
        $analyses = Analysis::where('user_id', $request->user()->id)->get();
        $total = $analyses->count();
        $healthyCount = $analyses->filter(fn ($a) => $this->isHealthy($a->predicted_class))->count();

        $diseases = $analyses->filter(fn ($a) => $a->predicted_class && ! $this->isHealthy($a->predicted_class))
            ->groupBy('predicted_class')
            ->map(function ($group, $predictedClass) use ($total) {
                $parts = explode('__', $predictedClass, 2);
                $count = $group->count();

                return [
                    'disease' => $parts[1] ?? 'Inconnu',
                    'crop' => $parts[0] ?? 'Inconnu',
                    'count' => $count,
                    'percentage' => $total > 0 ? round($count / $total * 100, 1) : 0.0,
                ];
            })
            ->sortByDesc('count')
            ->values()
            ->take(10)
            ->map(function ($item, $index) {
                $item['color'] = self::DISTRIBUTION_COLORS[$index % count(self::DISTRIBUTION_COLORS)];

                return $item;
            })
            ->all();

        return response()->json([
            'diseases' => $diseases,
            'total' => $total,
            'healthy_count' => $healthyCount,
            'healthy_percentage' => $total > 0 ? round($healthyCount / $total * 100, 1) : 0.0,
        ]);
    }

    public function analysesPerDay(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $month = $request->query('month');

        if (is_string($month) && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $start = Carbon::createFromFormat('Y-m-d', $month.'-01')->startOfDay();
            $end = $start->copy()->endOfMonth();
            $period = $month;
        } else {
            $end = now()->endOfDay();
            $start = now()->subDays(29)->startOfDay();
            $period = '30_derniers_jours';
        }

        $rows = Analysis::where('user_id', $userId)
            ->whereBetween('created_at', [$start, $end])
            ->get()
            ->groupBy(fn ($a) => Carbon::parse($a->created_at)->format('Y-m-d'));

        $data = [];
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            $dateStr = $cursor->format('Y-m-d');
            $dayRows = $rows->get($dateStr, collect());
            $diseaseCount = $dayRows->filter(fn ($a) => ! $this->isHealthy($a->predicted_class))->count();

            $data[] = [
                'date' => $dateStr,
                'count' => $dayRows->count(),
                'disease_count' => $diseaseCount,
                'healthy_count' => $dayRows->count() - $diseaseCount,
            ];

            $cursor->addDay();
        }

        $total = array_sum(array_column($data, 'count'));
        $daysCount = count($data);

        $availableMonths = Analysis::where('user_id', $userId)
            ->whereNotNull('created_at')
            ->pluck('created_at')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m'))
            ->unique()
            ->sort()
            ->values()
            ->all();

        return response()->json([
            'period' => $period,
            'data' => $data,
            'total' => $total,
            'average_per_day' => $daysCount > 0 ? round($total / $daysCount, 1) : 0.0,
            'available_months' => $availableMonths,
        ]);
    }

    public function cropDiversity(Request $request): JsonResponse
    {
        $analyses = Analysis::where('user_id', $request->user()->id)
            ->whereNotNull('predicted_class')
            ->get();

        $crops = $analyses
            ->groupBy(fn ($a) => explode('__', $a->predicted_class, 2)[0] ?: 'Inconnu')
            ->map(function ($group, $cropKey) {
                $total = $group->count();
                $healthyCount = $group->filter(fn ($a) => $this->isHealthy($a->predicted_class))->count();
                $diseaseCount = $total - $healthyCount;
                $label = self::CROP_LABELS[strtolower($cropKey)] ?? ['fr' => $cropKey, 'emoji' => '🌿'];
                $lastDate = $group->max('created_at');

                return [
                    'name' => $cropKey,
                    'name_fr' => $label['fr'],
                    'emoji' => $label['emoji'],
                    'analyses_count' => $total,
                    'disease_count' => $diseaseCount,
                    'healthy_count' => $healthyCount,
                    'health_percentage' => $total > 0 ? (int) round($healthyCount / $total * 100) : 0,
                    'last_analysis_date' => $lastDate ? Carbon::parse($lastDate)->format('Y-m-d') : null,
                ];
            })
            ->sortByDesc('analyses_count')
            ->values()
            ->all();

        $totalCrops = count($crops);

        return response()->json([
            'diversity_score' => min(100, $totalCrops * 20),
            'total_crops' => $totalCrops,
            'crops' => $crops,
        ]);
    }
}
