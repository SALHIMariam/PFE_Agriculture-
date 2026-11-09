<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Analysis;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    /** GET /api/admin/stats — KPIs globaux pour le dashboard admin. */
    public function stats(): JsonResponse
    {
        $data = Cache::remember('admin:dashboard:stats', 120, function () {
            $now = now();
            $thirtyDaysAgo = $now->copy()->subDays(30);
            $sixtyDaysAgo = $now->copy()->subDays(60);

            // Accuracy réelle : pas de colonne expert_diagnosis en base pour
            // comparer prédiction vs diagnostic expert au niveau du libellé
            // exact — on utilise donc le taux de validation parmi les cas
            // tranchés par un expert (validated / (validated + rejected)).
            $reviewed = Analysis::whereIn('validation_status', ['validated', 'rejected'])->count();
            $validated = Analysis::where('validation_status', 'validated')->count();
            $accuracyScore = $reviewed > 0 ? round($validated / $reviewed * 100, 2) : 0;

            $analysesThisPeriod = Analysis::where('status', 'done')
                ->where('created_at', '>=', $thirtyDaysAgo)->count();
            $analysesPrevPeriod = Analysis::where('status', 'done')
                ->whereBetween('created_at', [$sixtyDaysAgo, $thirtyDaysAgo])->count();

            $farmersThisPeriod = User::role('farmer')->where('is_active', true)
                ->where('created_at', '>=', $thirtyDaysAgo)->count();
            $farmersPrevPeriod = User::role('farmer')->where('is_active', true)
                ->whereBetween('created_at', [$sixtyDaysAgo, $thirtyDaysAgo])->count();

            return [
                'total_analyses' => Analysis::where('status', 'done')->count(),
                'total_farmers' => User::role('farmer')->where('is_active', true)->count(),
                'pending_validation' => Analysis::where('validation_status', 'pending')->count(),
                'validated_today' => Analysis::where('validation_status', 'validated')
                    ->whereDate('updated_at', $now->toDateString())
                    ->count(),
                // Un seul modèle déployé (EfficientNetB0) — pas de registre de
                // modèles multiples dans ce projet.
                'accuracy_score' => $accuracyScore,
                'models_active' => 1,
                'trends' => [
                    'analyses_delta' => $analysesThisPeriod - $analysesPrevPeriod,
                    'analyses_prev' => $analysesPrevPeriod,
                    'farmers_delta' => $farmersThisPeriod - $farmersPrevPeriod,
                    'farmers_prev' => $farmersPrevPeriod,
                ],
            ];
        });

        return response()->json($data);
    }

    /**
     * GET /api/admin/analyses-monthly — analyses des 6 derniers mois, ventilées
     * par statut de validation, pour le graphique en barres empilées.
     */
    public function analysesMonthly(): JsonResponse
    {
        $data = Cache::remember('admin:dashboard:analyses-monthly', 120, function () {
            $start = now()->subMonths(5)->startOfMonth();

            $rows = Analysis::where('status', 'done')
                ->where('created_at', '>=', $start)
                ->get(['created_at', 'validation_status']);

            $byMonth = $rows->groupBy(fn ($a) => Carbon::parse($a->created_at)->format('Y-m'));

            $months = [];
            $cursor = $start->copy();

            for ($i = 0; $i < 6; $i++) {
                $key = $cursor->format('Y-m');
                $monthRows = $byMonth->get($key, collect());

                $months[] = [
                    'month' => $cursor->translatedFormat('M Y'),
                    'validated' => $monthRows->where('validation_status', 'validated')->count(),
                    'pending' => $monthRows->where('validation_status', 'pending')->count(),
                    'rejected' => $monthRows->where('validation_status', 'rejected')->count(),
                ];

                $cursor->addMonth();
            }

            return $months;
        });

        return response()->json($data);
    }

    /** GET /api/admin/top-diseases — 5 maladies les plus fréquentes du mois en cours. */
    public function topDiseases(): JsonResponse
    {
        $monthKey = now()->format('Y-m');

        $data = Cache::remember("admin:dashboard:top-diseases:{$monthKey}", 120, function () {
            return Analysis::where('status', 'done')
                ->whereNotNull('predicted_class')
                ->where('predicted_class', 'not like', '%healthy%')
                ->where('created_at', '>=', now()->startOfMonth())
                ->get(['predicted_class'])
                ->map(fn ($a) => Str::contains($a->predicted_class, '__')
                    ? Str::after($a->predicted_class, '__')
                    : $a->predicted_class)
                ->countBy()
                ->sortDesc()
                ->take(5)
                ->map(fn ($count, $disease) => ['disease' => $disease, 'count' => $count])
                ->values()
                ->all();
        });

        return response()->json($data);
    }
}
