<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WeatherController extends Controller
{
    public function __construct(private readonly WeatherService $weatherService)
    {
    }

    /**
     * GET /api/weather/current — météo actuelle du gouvernorat du farmer
     * connecté. Cachée 30 min par gouvernorat (Open-Meteo, pas de clé, mais
     * inutile de le taper à chaque montage de la topbar).
     */
    public function current(Request $request): JsonResponse
    {
        $governorate = $request->user()->governorate;

        if (! $governorate) {
            return response()->json(['available' => false]);
        }

        $weather = Cache::remember(
            "weather_current:{$governorate}",
            now()->addMinutes(30),
            fn () => $this->weatherService->getWeatherForGovernorate($governorate),
        );

        if (! $weather || $weather['temperature'] === null) {
            return response()->json(['available' => false]);
        }

        [$condition, $icon] = $this->describe($weather['rainfall'] ?? 0.0);

        return response()->json([
            'available' => true,
            'governorate' => $governorate,
            'temperature' => (int) round($weather['temperature']),
            'humidity' => $weather['humidity'] !== null ? (int) round($weather['humidity']) : null,
            'condition' => $condition,
            'weather_condition' => $condition,
            'icon' => $icon,
        ]);
    }

    /**
     * @return array{0: string, 1: string} [condition, emoji]
     */
    private function describe(float $rainfall): array
    {
        if ($rainfall >= 2.0) {
            return ['rain', '🌧️'];
        }

        if ($rainfall > 0.0) {
            return ['drizzle', '🌦️'];
        }

        return ['clear', '⛅'];
    }
}
