<?php

namespace App\Console\Commands;

use App\Models\Analysis;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Throwable;

/**
 * Builds a realistic disease-outbreak scenario for the soutenance demo so the
 * risk model produces varied scores (low / medium / high / very_high) instead
 * of the flat 6-8 % it returns on the dispersed default demo data.
 *
 *   php artisan demo:outbreak            # (re)create the scenario
 *   php artisan demo:outbreak --clean    # remove the scenario only
 *
 * Two independent things happen on a normal run:
 *
 *  1. Demo farmers + analyses are inserted so cases are *concentrated*
 *     (one disease, a cluster of neighbouring governorates, accelerating
 *     week over week). This alone lifts Sfax from ~6 % to the "medium" band.
 *
 *  2. The RiskForecastService result cache (key "risk_forecast:{disease}:{gov}")
 *     is pre-warmed with a forecast computed against a synthetic "wet spell"
 *     weather series. The live Open-Meteo forecast for Tunisia in demo season
 *     is hot and bone dry, and humidity/rainfall are the model's dominant
 *     drivers, so without this the score can never leave "medium" no matter
 *     how large the outbreak is. The warmed entry is what the farmer
 *     dashboard, the admin Top-5, the Risk Calendar and `risk:check-alerts`
 *     all read for the next 12 h.
 *
 * Idempotent: every run wipes the previously created demo data (farmers matched
 * by the "outbreak-demo-*@agridetect.test" pattern; their analyses and
 * risk_alert_states rows cascade) before recreating it.
 *
 * Does NOT modify DemoAnalysesSeeder or any AI-model file.
 */
class DemoOutbreak extends Command
{
    protected $signature = 'demo:outbreak {--clean : Supprimer les données de démo sans les recréer}';

    protected $description = "Crée un scénario d'épidémie réaliste (Sfax en outbreak) pour la démo du modèle de risque.";

    private const EMAIL_LIKE = 'outbreak-demo-%@agridetect.test';

    /** Demo farmers to provision: governorate => how many. */
    private const FARMER_PLAN = [
        'Sfax' => 4,   // foyer principal de l'outbreak
        'Gabès' => 2,  // voisin de Sfax  — pression
        'Mahdia' => 2, // voisin de Sfax  — pression
        'Nabeul' => 2, // scénario secondaire modéré
        'Sousse' => 1, // voisin de Nabeul — pression
    ];

    /**
     * predicted_class + crop + climate zone + day-offset buckets for each
     * governorate. Bucket day ranges stay strictly inside the 7 / 14 / 30-day
     * windows RiskForecastService slices on, so the counts land where intended.
     *
     * @var array<string, array{class: string, crop: string, zone: string, buckets: list<array{days: array{0:int,1:int}, count: int}>}>
     */
    private const SCENARIOS = [
        // Sfax — Tomato early blight, épidémie qui ACCÉLÈRE.
        //   35 (j1-6) + 20 (j8-13) + 12 (j15-23) + 8 (j25-29) = 75 cas
        //   growth_rate = 35 / 20 = 1.75
        'Sfax' => [
            'class' => 'Tomato__early_blight', 'crop' => 'Tomato', 'zone' => 'centre',
            'buckets' => [
                ['days' => [25, 29], 'count' => 8],
                ['days' => [15, 23], 'count' => 12],
                ['days' => [8, 13], 'count' => 20],
                ['days' => [1, 6], 'count' => 35],
            ],
        ],
        // Gabès — même maladie, foyer voisin (32 cas).
        'Gabès' => [
            'class' => 'Tomato__early_blight', 'crop' => 'Tomato', 'zone' => 'sud',
            'buckets' => [
                ['days' => [15, 29], 'count' => 16],
                ['days' => [1, 13], 'count' => 16],
            ],
        ],
        // Mahdia — même maladie, foyer voisin plus récent (20 cas).
        'Mahdia' => [
            'class' => 'Tomato__early_blight', 'crop' => 'Tomato', 'zone' => 'centre',
            'buckets' => [
                ['days' => [15, 29], 'count' => 6],
                ['days' => [1, 6], 'count' => 14],
            ],
        ],
        // Nabeul — Potato late blight, progression modérée (32 cas) → "medium".
        'Nabeul' => [
            'class' => 'Potato__late_blight', 'crop' => 'Potato', 'zone' => 'nord',
            'buckets' => [
                ['days' => [15, 29], 'count' => 6],
                ['days' => [8, 13], 'count' => 10],
                ['days' => [1, 6], 'count' => 16],
            ],
        ],
        // Sousse — voisin de Nabeul, pression légère (10 cas).
        'Sousse' => [
            'class' => 'Potato__late_blight', 'crop' => 'Potato', 'zone' => 'centre',
            'buckets' => [
                ['days' => [1, 29], 'count' => 10],
            ],
        ],
    ];

    /**
     * Synthetic 8-day weather series per governorate: [hum0, hum7, rain0, rain7,
     * temp0, temp7], linearly interpolated across offsets 0..7. Tuned so the
     * risk model lands where the demo needs it (Sfax high→very_high with an
     * alert at horizon; Nabeul steady "medium").
     */
    private const WEATHER_CURVE = [
        'Sfax' => [80, 93, 6, 28, 27, 22],
        'Gabès' => [78, 90, 4, 20, 27, 22],
        'Mahdia' => [78, 90, 4, 20, 27, 22],
        'Nabeul' => [74, 88, 5, 18, 27, 24],
        'Sousse' => [70, 82, 3, 12, 27, 24],
    ];

    /** Mirrors RiskForecastService::CLIMATE_ZONE_MODEL_NAMES. */
    private const ZONE_MODEL_NAMES = ['nord' => 'North', 'centre' => 'Center', 'sud' => 'South'];

    public function handle(): int
    {
        $removed = $this->cleanup();

        if ($this->option('clean')) {
            Cache::flush();
            $this->info("{$removed} agriculteurs de démonstration supprimés (avec leurs analyses). Cache vidé.");

            return self::SUCCESS;
        }

        $farmers = $this->createFarmers();

        $rows = [];
        foreach (self::SCENARIOS as $governorate => $scenario) {
            $rows = array_merge($rows, $this->buildAnalyses(
                $farmers[$governorate],
                $scenario['class'],
                $scenario['crop'],
                $scenario['zone'],
                $scenario['buckets'],
            ));
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('analyses')->insert($chunk);
        }

        // Wipe first, warm second — the warmed forecast entries must survive.
        Cache::flush();
        $warmed = $this->warmForecastCache();

        $farmerCount = collect($farmers)->flatten()->count();
        $this->info("{$farmerCount} agriculteurs et ".count($rows).' analyses créés.');

        $this->newLine();
        $this->table(
            ['Gouvernorat', 'Maladie', 'Cas 30j', 'Risque J+0', 'Risque J+7', 'Alerte'],
            collect($warmed)->map(fn ($w) => [
                $w['governorate'],
                $w['disease'],
                $w['cases_30d'],
                $w['day0'] !== null ? $w['day0'].' ('.$w['level0'].')' : '—',
                $w['day7'] !== null ? $w['day7'].' ('.$w['level7'].')' : '—',
                $w['alert'] ? '🔴 oui' : 'non',
            ])->all(),
        );

        if (collect($warmed)->every(fn ($w) => $w['day7'] === null)) {
            $this->warn('Service de risque injoignable — les analyses sont créées mais le cache de prévision n\'a pas pu être préchauffé.');
            $this->warn('Démarrez-le (port 8006) puis relancez : php artisan demo:outbreak');
        } else {
            $this->line('Cache de prévision préchauffé pour 12 h. Rechargez les dashboards.');
        }

        return self::SUCCESS;
    }

    /**
     * Delete previously created demo farmers. Their analyses and
     * risk_alert_states rows cascade at the DB level (ON DELETE CASCADE).
     */
    private function cleanup(): int
    {
        return User::where('email', 'like', self::EMAIL_LIKE)->delete();
    }

    /**
     * @return array<string, int[]>  governorate => farmer ids
     */
    private function createFarmers(): array
    {
        $farmerRole = Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);

        $farmers = [];

        foreach (self::FARMER_PLAN as $governorate => $count) {
            $slug = Str::slug($governorate);
            $ids = [];

            for ($i = 1; $i <= $count; $i++) {
                $user = User::create([
                    'name' => "Outbreak démo {$governorate} {$i}",
                    'farm' => "Ferme outbreak {$governorate} {$i}",
                    'governorate' => $governorate,
                    'email' => "outbreak-demo-{$slug}-{$i}@agridetect.test",
                    'password' => Hash::make('password'),
                    'is_active' => true,
                    'must_change_password' => false,
                ]);

                $user->assignRole($farmerRole);
                $ids[] = $user->id;
            }

            $farmers[$governorate] = $ids;
        }

        return $farmers;
    }

    /**
     * @param  int[]  $farmerIds
     * @param  list<array{days: array{0: int, 1: int}, count: int}>  $buckets
     * @return list<array<string, mixed>>
     */
    private function buildAnalyses(array $farmerIds, string $predictedClass, string $crop, string $zone, array $buckets): array
    {
        $rows = [];
        $cursor = 0;

        foreach ($buckets as $bucket) {
            [$minDays, $maxDays] = $bucket['days'];

            for ($i = 0; $i < $bucket['count']; $i++) {
                $createdAt = now()
                    ->subDays(random_int($minDays, $maxDays))
                    ->subHours(random_int(0, 23))
                    ->subMinutes(random_int(0, 59));

                $farmerId = $farmerIds[$cursor % count($farmerIds)];
                $cursor++;

                $rows[] = [
                    'user_id' => $farmerId,
                    'image_path' => 'seed/outbreak/'.Str::uuid().'.jpg',
                    'gradcam_path' => null,
                    'predicted_class' => $predictedClass,
                    'crop' => $crop,
                    'confidence' => round(random_int(650, 950) / 1000, 4),
                    'top_k' => null,
                    'status' => 'done',
                    'inference_ms' => random_int(120, 900),
                    'error_message' => null,
                    'expert_id' => null,
                    'expert_validated_at' => null,
                    'validation_status' => 'validated',
                    'expert_comment' => null,
                    ...$this->weatherFor($zone),
                    'weather_fetched_at' => $createdAt,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];
            }
        }

        return $rows;
    }

    /**
     * Plausible stored-weather snapshot per climate zone. Cosmetic only — the
     * risk forecast uses the synthetic curve below, not these columns.
     *
     * @return array{temperature: float, humidity: float, rainfall: float, wind_speed: float}
     */
    private function weatherFor(string $zone): array
    {
        [$tempMin, $tempMax, $humMin, $humMax, $rainMax] = match ($zone) {
            'nord' => [18, 28, 65, 82, 15],
            'centre' => [24, 32, 55, 78, 12],
            'sud' => [26, 36, 40, 62, 8],
            default => [22, 32, 55, 75, 12],
        };

        return [
            'temperature' => round(random_int($tempMin * 10, $tempMax * 10) / 10, 1),
            'humidity' => round(random_int($humMin * 10, $humMax * 10) / 10, 1),
            'rainfall' => random_int(1, 100) <= 60 ? 0.0 : round(random_int(1, $rainMax * 10) / 10, 1),
            'wind_speed' => round(random_int(30, 250) / 10, 1),
        ];
    }

    /**
     * For every (disease, governorate) combo in SCENARIOS, compute an 8-day
     * forecast against a synthetic wet-spell weather series and write it to the
     * exact cache key RiskForecastService::computeDailyForecast() reads.
     *
     * @return list<array{governorate: string, disease: string, cases_30d: int, day0: ?int, level0: ?string, day7: ?int, level7: ?string, alert: bool}>
     */
    private function warmForecastCache(): array
    {
        $riskUrl = rtrim((string) config('services.ai_risk.url'), '/').'/spread-risk';
        $summary = [];

        foreach (self::SCENARIOS as $governorate => $scenario) {
            $disease = $scenario['class'];
            $crop = $scenario['crop'];

            [$cases7d, $cases14d, $cases30d, $growthRate, $avgSeverity] = $this->epiStats($disease, $governorate);
            $nearbyCases = $this->nearbyPressure($disease, $governorate);

            [$h0, $h7, $r0, $r7, $t0, $t7] = self::WEATHER_CURVE[$governorate];
            $modelZone = self::ZONE_MODEL_NAMES[$scenario['zone']];

            $days = [];
            $dayZeroFactors = [];
            $ok = true;

            foreach (range(0, 7) as $offset) {
                $date = now()->addDays($offset)->toDateString();
                $frac = $offset / 7;

                $result = $this->callRisk($riskUrl, [
                    'disease' => $disease,
                    'crop' => $crop,
                    'governorate' => $governorate,
                    'climate_zone' => $modelZone,
                    'month' => (int) Carbon::parse($date)->format('n'),
                    'temperature' => round($t0 + ($t7 - $t0) * $frac, 1),
                    'humidity' => round($h0 + ($h7 - $h0) * $frac, 1),
                    'rainfall' => round($r0 + ($r7 - $r0) * $frac, 1),
                    'wind_speed' => 12.0,
                    'cases_7d' => $cases7d,
                    'cases_14d' => $cases14d,
                    'cases_30d' => $cases30d,
                    'growth_rate' => $growthRate,
                    'avg_severity' => $avgSeverity,
                    'nearby_cases' => $nearbyCases,
                ]);

                if ($result === null) {
                    $ok = false;
                    $days[] = ['offset' => $offset, 'date' => $date, 'risk_score' => null, 'risk_level' => null];

                    continue;
                }

                $days[] = [
                    'offset' => $offset,
                    'date' => $date,
                    'risk_score' => $result['risk_score'] ?? null,
                    'risk_level' => $result['risk_level'] ?? null,
                ];

                if ($offset === 0) {
                    $dayZeroFactors = $result['top_factors'] ?? [];
                }
            }

            $day0 = $days[0]['risk_score'] ?? null;
            $day7 = $days[7]['risk_score'] ?? null;

            if ($ok) {
                Cache::put("risk_forecast:{$disease}:{$governorate}", [
                    'disease' => $disease,
                    'crop' => $crop,
                    'governorate' => $governorate,
                    'days' => $days,
                    'top_factors' => $dayZeroFactors,
                    'trend' => ($day0 !== null && $day7 !== null) ? $day7 - $day0 : null,
                    'alert' => $day7 !== null && $day7 >= 70,
                ], now()->addHours(12));
            }

            $summary[] = [
                'governorate' => $governorate,
                'disease' => $disease,
                'cases_30d' => $cases30d,
                'day0' => $day0,
                'level0' => $days[0]['risk_level'] ?? null,
                'day7' => $day7,
                'level7' => $days[7]['risk_level'] ?? null,
                'alert' => $day7 !== null && $day7 >= 70,
            ];
        }

        return $summary;
    }

    /**
     * cases_7d / _14d / _30d, growth_rate and avg_severity for a
     * (disease, governorate) pair — same definitions as
     * RiskForecastService::diseaseStats(), duplicated here so the warmed cache
     * entry matches what the service would have produced.
     *
     * @return array{0: int, 1: int, 2: int, 3: float, 4: float}
     */
    private function epiStats(string $disease, string $governorate): array
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

        $previousWeekCases = $cases14d - $cases7d;
        $growthRate = $previousWeekCases > 0
            ? round($cases7d / $previousWeekCases, 2)
            : ($cases7d > 0 ? 2.0 : 1.0);

        $avgSeverity = $rows->isNotEmpty() ? round((float) $rows->avg('confidence'), 4) : 0.5;

        return [$cases7d, $cases14d, $cases30d, $growthRate, $avgSeverity];
    }

    /**
     * Mean count of the same disease in neighbouring governorates over 30 days —
     * same definition as RiskForecastService::nearbyCases().
     */
    private function nearbyPressure(string $disease, string $governorate): float
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
     * @return array<string, mixed>|null
     */
    private function callRisk(string $url, array $payload): ?array
    {
        try {
            $response = Http::timeout(5)->post($url, $payload);
        } catch (Throwable) {
            return null;
        }

        return $response->successful() ? $response->json() : null;
    }
}
