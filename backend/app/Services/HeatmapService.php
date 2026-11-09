<?php

namespace App\Services;

use App\Models\Analysis;
use App\Support\DiseaseLabels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class HeatmapService
{
    /** Predicted-class disease keys that represent a healthy plant, not a disease. */
    private const HEALTHY_DISEASES = ['healthy', 'beans_healthy_crop'];

    /**
     * Short TTL: absorbs bursts of dashboard reloads/filter changes without
     * serving stale data for more than 2 minutes after a new analysis lands.
     */
    private const CACHE_TTL_SECONDS = 120;

    private function isHealthy(?string $disease): bool
    {
        return in_array($disease, self::HEALTHY_DISEASES, true);
    }

    public function points(array $filters): array
    {
        return Cache::remember($this->cacheKey('points', $filters), self::CACHE_TTL_SECONDS, function () use ($filters) {
            $governorates = config('tunisia.governorates');

            $counts = $this->filteredAnalyses($filters)
                ->filter(fn ($row) => ! $this->isHealthy($row->disease))
                ->groupBy('governorate')
                ->map->count();

            $points = [];

            foreach ($governorates as $governorate => $coords) {
                $points[] = [
                    'lat' => $coords['lat'],
                    'lng' => $coords['lng'],
                    'cases' => $counts->get($governorate, 0),
                    'governorate' => $governorate,
                ];
            }

            return $points;
        });
    }

    public function ranking(array $filters): array
    {
        return Cache::remember($this->cacheKey('ranking', $filters), self::CACHE_TTL_SECONDS, function () use ($filters) {
            $governorates = config('tunisia.governorates');

            $counts = $this->filteredAnalyses($filters)
                ->filter(fn ($row) => ! $this->isHealthy($row->disease))
                ->groupBy('governorate')
                ->map->count();

            return collect(array_keys($governorates))
                ->map(fn ($governorate) => [
                    'governorate' => $governorate,
                    'zone' => $governorates[$governorate]['zone'] ?? null,
                    'cases' => $counts->get($governorate, 0),
                ])
                ->sortByDesc('cases')
                ->values()
                ->all();
        });
    }

    public function timeline(int $year, array $filters): array
    {
        return Cache::remember($this->cacheKey("timeline:{$year}", $filters), self::CACHE_TTL_SECONDS, function () use ($year, $filters) {
            $rows = $this->filteredAnalyses($filters)
                ->filter(fn ($row) => ! $this->isHealthy($row->disease))
                ->filter(fn ($row) => Carbon::parse($row->created_at)->year === $year);

            $months = array_fill_keys(range(1, 12), 0);

            foreach ($rows as $row) {
                $months[Carbon::parse($row->created_at)->month]++;
            }

            return collect($months)
                ->map(fn ($cases, $month) => ['month' => $month, 'cases' => $cases])
                ->values()
                ->all();
        });
    }

    public function summary(string $governorate, array $filters): ?array
    {
        $coords = config('tunisia.governorates')[$governorate] ?? null;

        if (! $coords) {
            return null;
        }

        return Cache::remember($this->cacheKey("summary:{$governorate}", $filters), self::CACHE_TTL_SECONDS, function () use ($governorate, $filters, $coords) {
            return $this->buildSummary($governorate, $filters, $coords);
        });
    }

    /**
     * @param  array{zone: string}  $coords
     */
    private function buildSummary(string $governorate, array $filters, array $coords): array
    {
        $rows = $this->filteredAnalyses($filters)
            ->filter(fn ($row) => $row->governorate === $governorate);

        $totalRows = $rows->count();
        $diseasedRows = $rows->filter(fn ($r) => ! $this->isHealthy($r->disease));
        $detections = $diseasedRows->count();

        $now = Carbon::now();
        $lastMonth = $now->copy()->subMonthNoOverflow();
        $thisMonthCount = $diseasedRows->filter(fn ($row) => Carbon::parse($row->created_at)->isSameMonth($now))->count();
        $lastMonthCount = $diseasedRows->filter(fn ($row) => Carbon::parse($row->created_at)->isSameMonth($lastMonth))->count();

        $trendPct = $lastMonthCount > 0
            ? (int) round((($thisMonthCount - $lastMonthCount) / $lastMonthCount) * 100)
            : ($thisMonthCount > 0 ? 100 : 0);

        $crops = $rows->groupBy('crop')
            ->map(function (Collection $group, $crop) {
                $total = $group->count();
                $healthy = $group->filter(fn ($r) => $this->isHealthy($r->disease))->count();

                return [
                    'name' => $crop ?: 'Inconnu',
                    'emoji' => $this->emojiFor($crop),
                    'analyses' => $total,
                    'health' => $total > 0 ? (int) round(($healthy / $total) * 100) : 100,
                ];
            })
            ->sortByDesc('analyses')
            ->values()
            ->all();

        $diseases = $rows->groupBy(fn ($r) => ($r->crop ?: 'Unknown').'::'.($r->disease ?: 'unknown'))
            ->map(fn (Collection $group, $key) => [
                'name' => $this->labelForCropDisease($key),
                'pct' => $totalRows > 0 ? (int) round(($group->count() / $totalRows) * 100) : 0,
            ])
            ->sortByDesc('pct')
            ->values()
            ->all();

        $healthScore = $totalRows > 0 ? (int) round((1 - ($detections / $totalRows)) * 100) : 100;

        $riskLevel = match (true) {
            $detections >= 150 => 'Critique',
            $detections >= 80 => 'Élevé',
            $detections >= 30 => 'Modéré',
            $detections >= 1 => 'Faible',
            default => 'Sain',
        };

        return [
            'name' => $governorate,
            'climate_zone' => $coords['zone'],
            'risk_level' => $riskLevel,
            'detections' => $detections,
            'trend_pct' => $trendPct,
            'crops' => $crops,
            'diseases' => $diseases,
            'recommendations' => $this->recommendationsFor($riskLevel),
            'health_score' => $healthScore,
        ];
    }

    public function alerts(): array
    {
        return Cache::remember('heatmap:alerts', self::CACHE_TTL_SECONDS, function () {
            return $this->buildAlerts();
        });
    }

    private function buildAlerts(): array
    {
        $since = now()->subDays(7);

        $rows = Analysis::query()
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->whereNotNull('users.governorate')
            ->where('analyses.validation_status', 'validated')
            ->where('analyses.created_at', '>=', $since)
            ->select(['analyses.user_id', 'analyses.predicted_class', 'analyses.crop', 'analyses.created_at', 'users.governorate'])
            ->get()
            ->filter(fn ($r) => ! $this->isHealthy($r->disease));

        $grouped = $rows->groupBy(fn ($r) => $r->governorate.'::'.$r->crop.'::'.$r->disease);

        $alerts = [];

        foreach ($grouped as $key => $group) {
            [$governorate, $crop, $disease] = explode('::', $key, 3);
            $count = $group->count();
            $distinctFarmers = $group->pluck('user_id')->unique()->count();

            if ($count >= 5 || $distinctFarmers >= 3) {
                $alerts[] = [
                    'governorate' => $governorate,
                    'disease' => $this->labelForCropDisease($crop.'::'.$disease),
                    'disease_key' => $disease,
                    'cases' => $count,
                    'farmers' => $distinctFarmers,
                    'severity' => $count >= 15 ? 'critical' : ($count >= 10 ? 'high' : 'moderate'),
                    'message' => $count >= 15
                        ? 'Propagation rapide détectée'
                        : ($count >= 10 ? 'Concentration élevée' : 'Nouvelle alerte'),
                ];
            }
        }

        usort($alerts, fn ($a, $b) => $b['cases'] - $a['cases']);

        return $alerts;
    }

    private function cacheKey(string $prefix, array $filters): string
    {
        return 'heatmap:'.$prefix.':'.md5(json_encode($filters));
    }

    private function filteredAnalyses(array $filters): Collection
    {
        $query = Analysis::query()
            ->join('users', 'users.id', '=', 'analyses.user_id')
            ->whereNotNull('users.governorate')
            ->select([
                'analyses.id',
                'analyses.predicted_class',
                'analyses.crop',
                'analyses.confidence',
                'analyses.validation_status',
                'analyses.created_at',
                'users.governorate',
            ]);

        $status = $filters['status'] ?? 'validated';

        if ($status && $status !== 'all') {
            $query->where('analyses.validation_status', $status);
        }

        if (! empty($filters['plant'])) {
            $query->where('analyses.crop', $filters['plant']);
        }

        if (! empty($filters['from'])) {
            $query->whereDate('analyses.created_at', '>=', $filters['from']);
        }

        if (! empty($filters['to'])) {
            $query->whereDate('analyses.created_at', '<=', $filters['to']);
        }

        if (isset($filters['min_confidence']) && $filters['min_confidence'] !== null && $filters['min_confidence'] !== '') {
            $query->where('analyses.confidence', '>=', ((float) $filters['min_confidence']) / 100);
        }

        $rows = $query->get();

        if (! empty($filters['disease'])) {
            $rows = $rows->filter(fn ($row) => $row->disease === $filters['disease']);
        }

        return $rows->values();
    }

    private function jitter(): float
    {
        return mt_rand(-150, 150) / 1000;
    }

    private function emojiFor(?string $crop): string
    {
        return match (strtolower((string) $crop)) {
            'tomato' => '🍅',
            'grape' => '🍇',
            'wheat' => '🌾',
            'potato' => '🥔',
            'apple' => '🍎',
            'corn', 'maize' => '🌽',
            'pepper', 'chili' => '🌶️',
            'cucumber' => '🥒',
            'bean' => '🫘',
            'peanut' => '🥜',
            default => '🌿',
        };
    }

    private function labelForDisease(?string $disease): string
    {
        if (! $disease) {
            return 'Inconnu';
        }

        return Str::of($disease)->replace('_', ' ')->title()->toString();
    }

    private function labelForCropDisease(string $key): string
    {
        [$crop, $disease] = explode('::', $key, 2);

        if (! $disease || $disease === 'unknown') {
            return 'Inconnu';
        }

        return DiseaseLabels::crop($crop).' — '.DiseaseLabels::disease($disease, $crop);
    }

    private function recommendationsFor(string $riskLevel): array
    {
        return match ($riskLevel) {
            'Critique', 'Élevé' => [
                'Surveiller les cultures tous les 3 jours',
                'Éviter l\'irrigation en soirée',
                'Appliquer le fongicide recommandé',
                'Retirer les feuilles infectées',
            ],
            'Modéré' => [
                'Surveiller les cultures chaque semaine',
                'Éviter l\'irrigation en soirée',
                'Inspecter les feuilles régulièrement',
            ],
            'Faible' => [
                'Surveillance de routine hebdomadaire',
                'Maintenir une bonne aération des cultures',
            ],
            default => [
                'Aucune maladie détectée, continuez la surveillance de routine',
            ],
        };
    }
}
