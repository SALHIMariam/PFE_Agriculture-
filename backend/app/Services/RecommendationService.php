<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class RecommendationService
{
    public function getRecommendation(string $class, string $governorate, float $confidence): ?array
    {
        // La sortie est déterministe pour (classe, gouvernorat, palier de
        // confiance) : show()/latest() rappellent ce endpoint à chaque
        // affichage de la même analyse, donc on évite le round-trip HTTP
        // répété vers le microservice. Confiance arrondie au point pour ne
        // pas multiplier les clés inutilement (le seuil d'avertissement est à 0.60).
        $confidenceBucket = round($confidence, 2);
        $cacheKey = 'recommendation:'.md5($class.'|'.$governorate.'|'.$confidenceBucket);

        return Cache::remember($cacheKey, 3600, fn () => $this->fetchRecommendation($class, $governorate, $confidence));
    }

    private function fetchRecommendation(string $class, string $governorate, float $confidence): ?array
    {
        $url = config('services.recommendation.url');

        try {
            $response = Http::connectTimeout(3)
                ->timeout(10)
                ->acceptJson()
                ->post($url.'/recommendation', [
                    'class' => $class,
                    'governorate' => $governorate,
                    'confidence' => $confidence,
                ]);
        } catch (Throwable $e) {
            // Service injoignable / timeout de connexion : on dégrade proprement
            // (le contrôleur renvoie recommendation: null, jamais d'erreur 500).
            Log::warning('Recommendation service unreachable', [
                'url' => $url,
                'class' => $class,
                'governorate' => $governorate,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if ($response->failed()) {
            Log::error('Recommendation service returned an error', [
                'url' => $url,
                'class' => $class,
                'governorate' => $governorate,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        return $response->json();
    }
}
