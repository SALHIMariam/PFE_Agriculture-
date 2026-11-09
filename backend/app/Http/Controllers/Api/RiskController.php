<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RiskForecastService;
use App\Services\RiskRankingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RiskController extends Controller
{
    private const FR_DAY_NAMES = [
        1 => 'Lun', 2 => 'Mar', 3 => 'Mer', 4 => 'Jeu', 5 => 'Ven', 6 => 'Sam', 7 => 'Dim',
    ];

    public function __construct(
        private readonly RiskForecastService $riskForecastService,
        private readonly RiskRankingService $riskRankingService,
    ) {
    }

    /** GET /api/risk-forecast — full 8-day forecast for the authenticated farmer. */
    public function forecast(Request $request): JsonResponse
    {
        $forecast = $this->riskForecastService->getForecastForUser($request->user());

        if (! $forecast) {
            return response()->json(['available' => false]);
        }

        return response()->json(['available' => true, ...$forecast]);
    }

    /**
     * GET /api/risk-forecast/diseases — non-healthy diseases detected anywhere
     * in the authenticated farmer's governorate over the last 30 days (not just
     * their own analyses), so they can pick which one to forecast.
     */
    public function regionDiseases(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->governorate) {
            return response()->json(['available' => false]);
        }

        // Query builder (not Eloquent) so the aliased columns aren't shadowed
        // by the Analysis model's `disease` accessor / appended attribute.
        $diseases = DB::table('analyses')
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->where('users.governorate', $user->governorate)
            ->whereNotNull('analyses.predicted_class')
            ->where('analyses.predicted_class', 'not like', '%healthy%')
            ->where('analyses.created_at', '>=', now()->subDays(30))
            ->groupBy('analyses.predicted_class')
            ->select([
                'analyses.predicted_class as disease',
                DB::raw('MAX(analyses.crop) as crop'),
                DB::raw('COUNT(*) as cases_30d'),
            ])
            ->orderByDesc('cases_30d')
            ->orderBy('analyses.predicted_class')
            ->get()
            ->map(fn ($row) => [
                'disease' => $row->disease,
                'crop' => $row->crop ?? Str::before($row->disease, '__'),
                'cases_30d' => (int) $row->cases_30d,
            ]);

        return response()->json([
            'available' => true,
            'governorate' => $user->governorate,
            'diseases' => $diseases,
        ]);
    }

    /** GET /api/risk-forecast/calendar — same forecast, days 1-7 with French weekday names. */
    public function calendar(Request $request): JsonResponse
    {
        $forecast = $this->riskForecastService->getForecastForUser($request->user());

        if (! $forecast) {
            return response()->json(['available' => false]);
        }

        $weekDays = collect($forecast['days'])
            ->filter(fn ($day) => $day['offset'] >= 1 && $day['offset'] <= 7)
            ->map(fn ($day) => [
                'offset' => $day['offset'],
                'date' => $day['date'],
                'day_name' => self::FR_DAY_NAMES[Carbon::parse($day['date'])->dayOfWeekIso],
                'risk_score' => $day['risk_score'],
                'risk_level' => $day['risk_level'],
            ])
            ->values();

        $worstDay = $weekDays
            ->filter(fn ($day) => $day['risk_score'] !== null)
            ->sortByDesc('risk_score')
            ->first();

        $alertDay = ($worstDay && $worstDay['risk_score'] >= 70)
            ? ['day_name' => $worstDay['day_name'], 'risk_score' => $worstDay['risk_score']]
            : null;

        return response()->json([
            'available' => true,
            'disease' => $forecast['disease'],
            'crop' => $forecast['crop'],
            'governorate' => $forecast['governorate'],
            'days' => $weekDays,
            'alert_day' => $alertDay,
        ]);
    }

    /** GET /api/admin/risk-top — top 5 riskiest (disease, governorate) combos. */
    public function adminTop(): JsonResponse
    {
        $risks = $this->riskRankingService->getTopRisks(5);

        return response()->json([
            'available' => ! empty($risks),
            'risks' => $risks,
        ]);
    }

    /**
     * GET /api/stats/risk-evolution — day0 vs day7 (+ full curve) for:
     *  - a farmer without params: their most recent disease + governorate;
     *  - a farmer with ?disease=: that disease forecast for their governorate;
     *  - an admin without params: an average over the top 5 riskiest zones;
     *  - an admin with ?governorate=&disease=: that specific combo.
     */
    public function riskEvolution(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return $this->adminRiskEvolution($request);
        }

        $disease = $request->query('disease');

        if ($disease) {
            $climateZone = $user->governorate
                ? (config('tunisia.governorates')[$user->governorate]['zone'] ?? null)
                : null;

            if (! $climateZone || ! str_contains($disease, '__')) {
                return response()->json(['available' => false]);
            }

            $crop = Str::before($disease, '__');
            // Cache-backed (6h, keyed by disease+governorate) — no extra
            // FastAPI round-trip if this combo was already forecast.
            $forecast = $this->riskForecastService->computeDailyForecast($disease, $crop, $user->governorate, $climateZone);

            return $this->evolutionResponse($forecast);
        }

        $forecast = $this->riskForecastService->getForecastForUser($user);

        if (! $forecast) {
            return response()->json(['available' => false]);
        }

        return $this->evolutionResponse($forecast);
    }

    private function adminRiskEvolution(Request $request): JsonResponse
    {
        $governorate = $request->query('governorate');
        $disease = $request->query('disease');

        if ($governorate && $disease) {
            $climateZone = config('tunisia.governorates')[$governorate]['zone'] ?? null;

            if (! $climateZone || ! str_contains($disease, '__')) {
                return response()->json(['available' => false]);
            }

            $crop = Str::before($disease, '__');
            $forecast = $this->riskForecastService->computeDailyForecast($disease, $crop, $governorate, $climateZone);

            return $this->evolutionResponse($forecast);
        }

        return $this->aggregateTopRisksEvolution();
    }

    private function aggregateTopRisksEvolution(): JsonResponse
    {
        $top = $this->riskRankingService->getTopRisks(5);

        if (empty($top)) {
            return response()->json(['available' => false]);
        }

        // Re-running computeDailyForecast for each combo hits the same
        // 6h cache RiskRankingService just populated — no extra FastAPI cost.
        $forecasts = collect($top)
            ->map(function ($risk) {
                $climateZone = config('tunisia.governorates')[$risk['governorate']]['zone'] ?? null;

                return $climateZone
                    ? $this->riskForecastService->computeDailyForecast($risk['disease'], $risk['crop'], $risk['governorate'], $climateZone)
                    : null;
            })
            ->filter();

        if ($forecasts->isEmpty()) {
            return response()->json(['available' => false]);
        }

        $day0Scores = $forecasts->pluck('days.0.risk_score')->filter(fn ($v) => $v !== null);
        $day7Scores = $forecasts->pluck('days.7.risk_score')->filter(fn ($v) => $v !== null);

        if ($day0Scores->isEmpty() || $day7Scores->isEmpty()) {
            return response()->json(['available' => false]);
        }

        $day0 = (int) round($day0Scores->avg());
        $day7 = (int) round($day7Scores->avg());

        return response()->json([
            'available' => true,
            'scope' => 'aggregate_top5',
            'day0' => ['offset' => 0, 'risk_score' => $day0],
            'day7' => ['offset' => 7, 'risk_score' => $day7],
            'trend' => $day7 - $day0,
        ]);
    }

    /**
     * @param  array{disease: string, crop: string, governorate: string, days: array, trend: ?int}  $forecast
     */
    private function evolutionResponse(array $forecast): JsonResponse
    {
        return response()->json([
            'available' => true,
            'scope' => 'single',
            'disease' => $forecast['disease'],
            'crop' => $forecast['crop'],
            'governorate' => $forecast['governorate'],
            'day0' => $forecast['days'][0],
            'day7' => $forecast['days'][7],
            'days' => $forecast['days'],
            'trend' => $forecast['trend'],
            'unsupported' => $forecast['unsupported'] ?? false,
        ]);
    }
}
