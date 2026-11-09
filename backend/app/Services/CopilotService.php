<?php

namespace App\Services;

use App\Models\Analysis;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Bridge to the Assistant AI FastAPI service (ai/copilot_serving, port
 * 8007 by default): builds the analysis context payload, calls
 * POST /copilot/prepare, and persists the resulting draft/priority/safety/
 * confidence fields on the analysis for the copilot queue to read back.
 */
class CopilotService
{
    /**
     * Le gouvernorat en base ne correspond pas toujours à l'orthographe
     * attendue par les services IA (mêmes 24 gouvernorats, alias legacy) —
     * même correction que RiskForecastService::GOVERNORATE_MODEL_NAMES,
     * adaptée à ce que le service Copilot/Recommandation reconnaît
     * (cf. ai/ML_Recommandation/Recommendation/src/config.py::normalize_governorate,
     * qui tolère déjà l'absence d'accents mais pas ce "Le " préfixé).
     */
    private const GOVERNORATE_ALIASES = [
        'Le Kef' => 'Kef',
    ];

    public function __construct(
        private readonly RecommendationService $recommendationService,
    ) {
    }

    /**
     * @return array{safety: array, priority: array, confidence: array, draft: array, knowledge: array}
     */
    public function prepare(Analysis $analysis): array
    {
        if ($analysis->cnn_validation_status !== 'pending' || $analysis->reco_validation_status !== 'pending') {
            throw new RuntimeException('Cette analyse a déjà été traitée par un expert.');
        }

        $farmer = $analysis->user;
        $governorate = $this->normalizeGovernorate($farmer?->governorate);

        $payload = [
            'analysis_id' => $analysis->id,
            'predicted_class' => $analysis->predicted_class,
            'confidence' => $analysis->confidence,
            'top3' => $this->buildTop3($analysis),
            'governorate' => $governorate,
            'farmer_name' => $farmer?->full_name,
            'recommendation' => $this->buildRecommendation($analysis, $governorate),
            'weather' => $this->buildWeather($analysis),
            // La table `analyses` ne persiste pas de niveau de risque (voir
            // RiskForecastService pour la prévision à la demande) : rien de
            // fiable à envoyer ici sans appeler un second service FastAPI.
            'risk_level' => null,
            'history_count' => $this->historyCount($analysis, $farmer),
            'pending_similar_count' => $this->pendingSimilarCount($analysis, $farmer),
        ];

        $url = rtrim((string) config('services.ai_copilot.url'), '/').'/copilot/prepare';

        try {
            $response = Http::timeout(10)->post($url, $payload);
        } catch (Throwable $e) {
            Log::error('CopilotService: /copilot/prepare injoignable', [
                'analysis_id' => $analysis->id,
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('Service Assistant AI injoignable.', 0, $e);
        }

        if ($response->failed()) {
            Log::error('CopilotService: /copilot/prepare a retourné une erreur', [
                'analysis_id' => $analysis->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('Le service Assistant AI a renvoyé une erreur.');
        }

        $result = $response->json();

        $analysis->update([
            'draft_response' => $result['draft']['body'] ?? null,
            'priority_score' => $result['priority']['score'] ?? null,
            'priority_level' => $result['priority']['level'] ?? null,
            'safety_verdict' => $result['safety']['verdict'] ?? null,
            'confidence_score' => $result['confidence']['score'] ?? null,
        ]);

        return $result;
    }

    /**
     * Nombre d'analyses en attente pour la même maladie dans le même
     * gouvernorat (hors l'analyse courante) — sert à détecter les foyers.
     */
    private function pendingSimilarCount(Analysis $analysis, ?User $farmer): int
    {
        if (! $analysis->predicted_class || ! $farmer?->governorate) {
            return 0;
        }

        return Analysis::query()
            ->where('predicted_class', $analysis->predicted_class)
            ->where('validation_status', 'pending')
            ->where('id', '!=', $analysis->id)
            ->whereHas('user', fn ($q) => $q->where('governorate', $farmer->governorate))
            ->count();
    }

    /** Nombre d'analyses précédentes de ce farmer (hors l'analyse courante). */
    private function historyCount(Analysis $analysis, ?User $farmer): int
    {
        if (! $farmer) {
            return 0;
        }

        return Analysis::where('user_id', $farmer->id)
            ->where('id', '!=', $analysis->id)
            ->count();
    }

    /**
     * @return array{label: string, score: float}[]
     */
    private function buildTop3(Analysis $analysis): array
    {
        $topK = $analysis->top_k ?? [];

        if (empty($topK)) {
            return [[
                'label' => $analysis->disease ?? $analysis->predicted_class ?? 'inconnu',
                'score' => $analysis->confidence !== null ? round((float) $analysis->confidence, 4) : 0.0,
            ]];
        }

        return collect($topK)
            ->take(3)
            ->map(function ($entry) {
                $label = $entry['class'] ?? $entry['label'] ?? 'inconnu';
                $raw = (float) ($entry['confidence'] ?? $entry['score'] ?? 0);
                // Le service Copilot attend une fraction 0-1 (même échelle que
                // `confidence` au niveau racine du payload) ; se prémunir
                // contre une valeur déjà exprimée en pourcentage 0-100.
                $score = $raw > 1 ? $raw / 100 : $raw;

                return ['label' => $label, 'score' => round($score, 4)];
            })
            ->values()
            ->all();
    }

    /**
     * @return array{id: mixed, treatment: ?string, prevention: ?string, irrigation: ?string}|null
     */
    private function buildRecommendation(Analysis $analysis, ?string $governorate): ?array
    {
        if (! $analysis->predicted_class || ! $governorate) {
            return null;
        }

        $reco = $this->recommendationService->getRecommendation(
            $analysis->predicted_class,
            $governorate,
            (float) ($analysis->confidence ?? 0),
        );

        if (! $reco) {
            return null;
        }

        return [
            'id' => $reco['recommendation_id'] ?? null,
            // Le schéma Copilot attend une chaîne (Optional[str]) pour ces
            // trois champs ; le service de recommandation renvoie des
            // structures (dict / liste) — on les aplatit en texte lisible.
            'treatment' => $this->flattenRecommendationField($reco['traitements'] ?? null),
            'prevention' => $this->flattenRecommendationField($reco['prevention'] ?? null),
            'irrigation' => $this->flattenRecommendationField($reco['irrigation'] ?? null),
        ];
    }

    /**
     * Aplati un champ de recommandation (chaîne, liste de chaînes, ou objet
     * {catégorie => liste}) en une seule chaîne lisible.
     */
    private function flattenRecommendationField(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            return $value;
        }

        if (! is_array($value)) {
            return (string) $value;
        }

        $isList = array_is_list($value);

        if ($isList) {
            $items = array_filter(array_map('strval', $value), fn ($v) => $v !== '');

            return $items === [] ? null : implode('; ', $items);
        }

        // Objet { chimique: [...], biologique: [...], organique: [...] }
        $parts = [];
        foreach ($value as $category => $items) {
            $items = is_array($items) ? $items : [$items];
            $items = array_filter(array_map('strval', $items), fn ($v) => $v !== '');
            if ($items === []) {
                continue;
            }
            $parts[] = ucfirst((string) $category).' : '.implode('; ', $items);
        }

        return $parts === [] ? null : implode(' — ', $parts);
    }

    /**
     * Corrige les orthographes de gouvernorat legacy que les services IA ne
     * reconnaissent pas (voir self::GOVERNORATE_ALIASES).
     */
    private function normalizeGovernorate(?string $governorate): ?string
    {
        if (! $governorate) {
            return null;
        }

        return self::GOVERNORATE_ALIASES[$governorate] ?? $governorate;
    }

    /**
     * @return array{temperature: ?float, humidity: ?float, rainfall: ?float, wind_speed: ?float}|null
     */
    private function buildWeather(Analysis $analysis): ?array
    {
        if (! $analysis->weather_fetched_at) {
            return null;
        }

        return [
            'temperature' => $analysis->temperature,
            'humidity' => $analysis->humidity,
            'rainfall' => $analysis->rainfall,
            'wind_speed' => $analysis->wind_speed,
        ];
    }
}
