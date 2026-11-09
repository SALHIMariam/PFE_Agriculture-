<?php

namespace App\Services;

use App\Models\Analysis;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class RiskForecastService
{
    private const CACHE_TTL_HOURS = 6;

    /**
     * config('tunisia.*') governorate/zone spellings differ from the values
     * the risk model's LabelEncoders were trained on. Translated here rather
     * than in config/tunisia.php, which is shared by the heatmap and must
     * keep its existing spellings.
     */
    private const GOVERNORATE_MODEL_NAMES = [
        'Le Kef' => 'Kef',
        'Kebili' => 'Kébili',
    ];

    private const CLIMATE_ZONE_MODEL_NAMES = [
        'nord' => 'North',
        'centre' => 'Center',
        'sud' => 'South',
    ];

    /**
     * Noms de classes du CNN (analyses.predicted_class) qui désignent la même
     * maladie qu'une classe du modèle de risque sous un autre libellé. Sans
     * cette traduction, /spread-risk répond 422 « Valeur inconnue ».
     */
    private const DISEASE_MODEL_NAMES = [
        'Tomato__spider_mites' => 'Tomato__spider_mites_two_spotted_spider_mite',
        'Apple__apple_scab' => 'Apple__scab',
        'Wheat__yellow_rust' => 'Wheat__stripe_rust',
        'Grape__esca' => 'Grape__black_measles',
    ];

    /**
     * Classes du CNN sans équivalent dans le modèle de risque : on n'appelle
     * pas FastAPI (422 garanti) et on renvoie une prévision marquée
     * `unsupported`. À retirer une fois le modèle réentraîné avec ces classes.
     */
    private const UNSUPPORTED_DISEASES = [
        'Wheat__brown_rust',
        'Tomato__leaf_mold',
    ];

    public function __construct(
        private readonly WeatherService $weatherService,
    ) {
    }

    /**
     * Full 8-day (offset 0-7) risk forecast for one (disease, governorate)
     * pair. Cached 6h — two farmers in the same governorate with the same
     * disease share one computation instead of hitting FastAPI per user.
     *
     * $disease is the full predicted_class, e.g. "Tomato__early_blight"
     * (matches the risk model's 'disease' encoder, trained on that format).
     */
    public function computeDailyForecast(string $disease, string $crop, string $governorate, string $climateZone): array
    {
        $cacheKey = "risk_forecast:{$disease}:{$governorate}";

        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $forecast = $this->buildForecast($disease, $crop, $governorate, $climateZone);

        // Ne mettre en cache que les prévisions exploitables : un échec
        // passager (service de risque arrêté, Open-Meteo en 503) renvoie des
        // scores tous null, qui resteraient sinon affichés pendant 6h.
        $hasScore = collect($forecast['days'])->contains(fn ($d) => $d['risk_score'] !== null);

        if ($hasScore || $forecast['unsupported']) {
            Cache::put($cacheKey, $forecast, now()->addHours(self::CACHE_TTL_HOURS));
        }

        return $forecast;
    }

    /** Vrai si le modèle de risque couvre cette classe du CNN (directement ou via traduction). */
    public function isSupportedDisease(string $disease): bool
    {
        return ! in_array($disease, self::UNSUPPORTED_DISEASES, true);
    }

    /**
     * Forecast for a farmer's own situation: their most recent non-healthy
     * analysis + their governorate. Null when there's nothing to forecast
     * (no governorate, or no disease analysis on record).
     */
    public function getForecastForUser(User $user): ?array
    {
        if (! $user->governorate) {
            return null;
        }

        $climateZone = config('tunisia.governorates')[$user->governorate]['zone'] ?? null;

        if (! $climateZone) {
            return null;
        }

        $analysis = Analysis::where('user_id', $user->id)
            ->whereNotNull('predicted_class')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->first(fn (Analysis $a) => ! str_contains(strtolower($a->predicted_class), 'healthy'));

        if (! $analysis) {
            return null;
        }

        return $this->computeDailyForecast($analysis->predicted_class, $analysis->crop, $user->governorate, $climateZone);
    }

    private function buildForecast(string $disease, string $crop, string $governorate, string $climateZone): array
    {
        if (! $this->isSupportedDisease($disease)) {
            return [
                'disease' => $disease,
                'crop' => $crop,
                'governorate' => $governorate,
                'days' => array_map(fn ($offset) => [
                    'offset' => $offset,
                    'date' => now()->addDays($offset)->toDateString(),
                    'risk_score' => null,
                    'risk_level' => null,
                ], range(0, 7)),
                'top_factors' => [],
                'trend' => null,
                'alert' => false,
                'unsupported' => true,
            ];
        }

        [$cases7d, $cases14d, $cases30d, $growthRate, $avgSeverity] = $this->diseaseStats($disease, $governorate);
        $nearbyCases = $this->nearbyCases($disease, $governorate);

        $forecast = $this->weatherService->getDailyForecastForGovernorate($governorate);

        $modelDisease = self::DISEASE_MODEL_NAMES[$disease] ?? $disease;
        $modelGovernorate = self::GOVERNORATE_MODEL_NAMES[$governorate] ?? $governorate;
        $modelClimateZone = self::CLIMATE_ZONE_MODEL_NAMES[$climateZone] ?? $climateZone;

        $days = [];
        $dayZeroFactors = [];

        foreach (range(0, 7) as $offset) {
            $weatherDay = $forecast[$offset] ?? null;

            if (! $weatherDay || $weatherDay['temperature'] === null) {
                $days[] = [
                    'offset' => $offset,
                    'date' => $weatherDay['date'] ?? now()->addDays($offset)->toDateString(),
                    'risk_score' => null,
                    'risk_level' => null,
                ];

                continue;
            }

            $result = $this->callSpreadRisk([
                'disease' => $modelDisease,
                'crop' => $crop,
                'governorate' => $modelGovernorate,
                'climate_zone' => $modelClimateZone,
                'month' => (int) Carbon::parse($weatherDay['date'])->format('n'),
                'temperature' => $weatherDay['temperature'],
                'humidity' => $weatherDay['humidity'],
                'rainfall' => $weatherDay['rainfall'],
                'wind_speed' => $weatherDay['wind_speed'],
                'cases_7d' => $cases7d,
                'cases_14d' => $cases14d,
                'cases_30d' => $cases30d,
                'growth_rate' => $growthRate,
                'avg_severity' => $avgSeverity,
                'nearby_cases' => $nearbyCases,
            ]);

            $days[] = [
                'offset' => $offset,
                'date' => $weatherDay['date'],
                'risk_score' => $result['risk_score'] ?? null,
                'risk_level' => $result['risk_level'] ?? null,
            ];

            if ($offset === 0) {
                $dayZeroFactors = $result['top_factors'] ?? [];
            }
        }

        $dayZero = $days[0]['risk_score'] ?? null;
        $daySeven = $days[7]['risk_score'] ?? null;

        return [
            'disease' => $disease,
            'crop' => $crop,
            'governorate' => $governorate,
            'days' => $days,
            'top_factors' => $dayZeroFactors,
            'trend' => ($dayZero !== null && $daySeven !== null) ? $daySeven - $dayZero : null,
            'alert' => $daySeven !== null && $daySeven >= 70,
            'unsupported' => false,
        ];
    }

    /**
     * @return array{0: int, 1: int, 2: int, 3: float, 4: float} [cases_7d, cases_14d, cases_30d, growth_rate, avg_severity]
     */
    private function diseaseStats(string $disease, string $governorate): array
    {
        $now = now();

        $rows = Analysis::query()
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->where('analyses.predicted_class', $disease)
            ->where('users.governorate', $governorate)
            ->where('analyses.created_at', '>=', $now->copy()->subDays(30))
            ->select(['analyses.created_at', 'analyses.confidence'])
            ->get();

        $cases7d = $rows->filter(fn ($r) => Carbon::parse($r->created_at)->gte($now->copy()->subDays(7)))->count();
        $cases14d = $rows->filter(fn ($r) => Carbon::parse($r->created_at)->gte($now->copy()->subDays(14)))->count();
        $cases30d = $rows->count();

        // Momentum: cases in the most recent week vs. the week before it.
        // >1 = accelerating, <1 = slowing, 1.0 = stable/no prior data (also
        // the risk model's own documented default for "no trend").
        $previousWeekCases = $cases14d - $cases7d;
        $growthRate = $previousWeekCases > 0
            ? round($cases7d / $previousWeekCases, 2)
            : ($cases7d > 0 ? 2.0 : 1.0);

        $avgSeverity = $rows->isNotEmpty() ? round((float) $rows->avg('confidence'), 4) : 0.5;

        return [$cases7d, $cases14d, $cases30d, $growthRate, $avgSeverity];
    }

    private function nearbyCases(string $disease, string $governorate): float
    {
        $neighbors = config('tunisia.neighbors')[$governorate] ?? [];

        if (empty($neighbors)) {
            return 0.0;
        }

        $counts = Analysis::query()
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->where('analyses.predicted_class', $disease)
            ->whereIn('users.governorate', $neighbors)
            ->where('analyses.created_at', '>=', now()->subDays(30))
            ->count();

        return round($counts / count($neighbors), 2);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{risk_score: int, risk_level: string, top_factors: array}|null
     */
    private function callSpreadRisk(array $payload): ?array
    {
        $url = rtrim((string) config('services.ai_risk.url'), '/').'/spread-risk';

        try {
            $response = Http::timeout(5)->post($url, $payload);
        } catch (Throwable $e) {
            Log::error('RiskForecastService: /spread-risk injoignable', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);

            return null;
        }

        if ($response->failed()) {
            Log::error('RiskForecastService: /spread-risk a retourné une erreur', [
                'status' => $response->status(),
                'body' => $response->body(),
                'payload' => $payload,
            ]);

            return null;
        }

        return $response->json();
    }
}
