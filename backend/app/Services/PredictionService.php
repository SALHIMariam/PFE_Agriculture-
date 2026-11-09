<?php

namespace App\Services;

use App\Exceptions\PredictionServiceException;
use App\Models\Analysis;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PredictionService
{
    public function __construct(
        private readonly WeatherService $weatherService,
        private readonly CopilotService $copilotService,
    ) {
    }

    public function analyze(Analysis $analysis): void
    {
        $url = config('services.ai.url');

        try {
            $response = Http::timeout(30)
                ->attach(
                    'file',
                    Storage::disk('public')->get($analysis->image_path),
                    basename($analysis->image_path)
                )
                ->post($url.'/predict');
        } catch (ConnectionException $e) {
            Log::error('AI service unreachable', [
                'analysis_id' => $analysis->id,
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            $this->markFailed($analysis, 'Le service d\'analyse est indisponible.');

            throw new PredictionServiceException('Le service d\'analyse est indisponible.', previous: $e);
        }

        if ($response->failed()) {
            Log::error('AI service returned an error', [
                'analysis_id' => $analysis->id,
                'url' => $url,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $this->markFailed($analysis, 'Le service d\'analyse a rencontré une erreur.');

            throw new PredictionServiceException('Le service d\'analyse a rencontré une erreur.');
        }

        $data = $response->json();

        $analysis->update([
            'predicted_class' => $data['predicted_class'],
            'crop' => $this->deriveCrop($data['predicted_class']),
            'confidence' => $data['confidence'],
            'top_k' => $data['top_k'],
            'inference_ms' => $data['inference_ms'],
            'gradcam_path' => $this->storeGradcam($analysis, $data['gradcam_base64'] ?? null),
            'status' => 'done',
        ]);

        // validation_status reste 'pending' (défaut colonne) quelle que soit la
        // confiance IA : seule une vraie validation experte (CNN + reco, via
        // AnalysisController::syncGlobalValidationStatus) peut le faire passer
        // à 'validated'. Avant, un seuil de confiance >= 0.85 le mettait direct
        // à 'validated' sans expert ni synchronisation des axes cnn/reco —
        // désynchronisation reproductible à chaque analyse à haute confiance.

        $this->attachWeather($analysis);
        $this->prepareCopilotDraft($analysis);
    }

    /**
     * Génère le brouillon Assistant AI dès la création de l'analyse, pour
     * qu'elle apparaisse immédiatement dans la file /dashboard/copilot (qui
     * filtre sur draft_response IS NOT NULL) au lieu de rester invisible
     * tant qu'un expert n'ouvre pas son détail ou qu'un admin ne relance pas
     * `copilot:prepare-all` manuellement. Best-effort : une panne du service
     * Assistant AI ne doit jamais faire échouer la création de l'analyse —
     * elle sera simplement absente de la file tant que non préparée, comme
     * avant ce correctif.
     */
    private function prepareCopilotDraft(Analysis $analysis): void
    {
        try {
            $this->copilotService->prepare($analysis->fresh());
        } catch (\Throwable $e) {
            Log::error('Échec de la préparation Assistant AI à la création de l\'analyse', [
                'analysis_id' => $analysis->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Enrich the analysis with the current weather of the farmer's governorate.
     * Best-effort only: a failure here never blocks or fails the analysis.
     */
    private function attachWeather(Analysis $analysis): void
    {
        $governorate = $analysis->user?->governorate;

        if (! $governorate) {
            return;
        }

        $weather = $this->weatherService->getWeatherForGovernorate($governorate);

        if (! $weather) {
            return;
        }

        $analysis->update([
            'temperature' => $weather['temperature'],
            'humidity' => $weather['humidity'],
            'rainfall' => $weather['rainfall'],
            'wind_speed' => $weather['wind_speed'],
            'weather_fetched_at' => now(),
        ]);
    }

    private function storeGradcam(Analysis $analysis, ?string $gradcamBase64): ?string
    {
        if (! $gradcamBase64) {
            return null;
        }

        $contents = base64_decode($gradcamBase64, strict: true);

        if ($contents === false) {
            Log::error('AI service returned an invalid gradcam_base64 payload', [
                'analysis_id' => $analysis->id,
            ]);

            return null;
        }

        $path = "gradcam/{$analysis->id}.jpg";
        Storage::disk('public')->put($path, $contents);

        return $path;
    }

    private function deriveCrop(string $predictedClass): string
    {
        return Str::before($predictedClass, '__');
    }

    private function markFailed(Analysis $analysis, string $message): void
    {
        $analysis->update([
            'status' => 'failed',
            'error_message' => $message,
        ]);
    }
}
