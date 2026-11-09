<?php

namespace App\Services;

use App\Models\Analysis;
use Illuminate\Support\Facades\Log;

class RiskRankingService
{
    /**
     * Hard time budget for the whole ranking loop. Each combo can cost up to
     * ~5s (RiskForecastService's FastAPI timeout) on a cache miss, and the
     * number of distinct (disease, governorate) combos grows with the data —
     * without a budget, enough simultaneous cold-cache combos (e.g. seeded
     * diseases the FastAPI model doesn't recognize, which fail every time)
     * can exceed PHP's max_execution_time and crash the whole request. We'd
     * rather return a partial ranking than let that happen.
     */
    private const TIME_BUDGET_SECONDS = 20.0;

    /** Upper bound on how many distinct combos we even attempt per call. */
    private const MAX_CANDIDATES = 20;

    public function __construct(
        private readonly RiskForecastService $riskForecastService,
    ) {
    }

    /**
     * Top N (disease, governorate) combinations by predicted risk 7 days out,
     * across every farmer. Each combination's forecast is cache-backed by
     * RiskForecastService (6h TTL, keyed by disease+governorate), so this
     * never triggers more than one FastAPI round-trip per combo per window.
     *
     * @return list<array{disease: string, crop: string, governorate: string, risk_score: int, risk_level: string, top_factors: array}>
     */
    public function getTopRisks(int $limit = 5): array
    {
        return $this->rank($limit, includeDays: false);
    }

    /**
     * Same ranking as getTopRisks(), but each entry also carries the full
     * 8-day forecast curve (`days`, offsets 0-7 with a real date per day).
     * Reads the same 6h cache getTopRisks() populates — no extra FastAPI cost.
     *
     * @return list<array{disease: string, crop: string, governorate: string, risk_score: int, risk_level: string, top_factors: array, days: array}>
     */
    public function getTopRisksWithForecast(int $limit = 10): array
    {
        return $this->rank($limit, includeDays: true);
    }

    private function rank(int $limit, bool $includeDays): array
    {
        $combos = $this->distinctDiseaseGovernoratePairs();

        $ranked = [];
        $startedAt = microtime(true);

        foreach ($combos as $combo) {
            if ((microtime(true) - $startedAt) >= self::TIME_BUDGET_SECONDS) {
                Log::warning('RiskRankingService: budget temps dépassé, classement partiel retourné', [
                    'processed' => count($ranked),
                    'total_candidates' => $combos->count(),
                ]);

                break;
            }

            $climateZone = config('tunisia.governorates')[$combo->governorate]['zone'] ?? null;

            if (! $climateZone) {
                continue;
            }

            $forecast = $this->riskForecastService->computeDailyForecast(
                $combo->predicted_class,
                $combo->crop,
                $combo->governorate,
                $climateZone,
            );

            $daySeven = $forecast['days'][7] ?? null;

            if (! $daySeven || $daySeven['risk_score'] === null) {
                continue;
            }

            $entry = [
                'disease' => $combo->predicted_class,
                'crop' => $combo->crop,
                'governorate' => $combo->governorate,
                'risk_score' => $daySeven['risk_score'],
                'risk_level' => $daySeven['risk_level'],
                'top_factors' => $forecast['top_factors'],
            ];

            if ($includeDays) {
                $entry['days'] = $forecast['days'];
            }

            $ranked[] = $entry;
        }

        usort($ranked, fn ($a, $b) => $b['risk_score'] <=> $a['risk_score']);

        return array_slice($ranked, 0, $limit);
    }

    /**
     * @return \Illuminate\Support\Collection<int, object{predicted_class: string, crop: string, governorate: string}>
     */
    private function distinctDiseaseGovernoratePairs()
    {
        // Grouping (rather than SELECT DISTINCT) lets us order by each combo's
        // most recent activity — Postgres rejects ORDER BY on a column that
        // isn't in a DISTINCT SELECT, and the most recently active combos are
        // the most relevant candidates for "today's risk" anyway.
        return Analysis::query()
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->whereNotNull('analyses.predicted_class')
            ->whereNotNull('users.governorate')
            ->where('analyses.predicted_class', 'not like', '%healthy%')
            ->where('analyses.created_at', '>=', now()->subDays(30))
            ->selectRaw('analyses.predicted_class, analyses.crop, users.governorate, MAX(analyses.created_at) as last_seen_at')
            ->groupBy('analyses.predicted_class', 'analyses.crop', 'users.governorate')
            ->orderByDesc('last_seen_at')
            ->limit(self::MAX_CANDIDATES)
            ->get();
    }
}
