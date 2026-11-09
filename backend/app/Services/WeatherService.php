<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class WeatherService
{
    private const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

    /**
     * Fetch current weather conditions for a Tunisian governorate via Open-Meteo.
     *
     * Never throws: on any failure (unknown governorate, timeout, HTTP error,
     * unexpected payload) it logs the issue and returns null so the calling
     * analysis flow is never blocked by an unavailable weather API.
     *
     * @return array{temperature: ?float, humidity: ?float, rainfall: ?float, wind_speed: ?float}|null
     */
    public function getWeatherForGovernorate(string $governorate): ?array
    {
        $coords = config('tunisia.governorates')[$governorate] ?? null;

        if (! $coords) {
            Log::warning('WeatherService: gouvernorat introuvable', ['governorate' => $governorate]);

            return null;
        }

        try {
            $response = Http::timeout(5)->get(self::BASE_URL, [
                'latitude' => $coords['lat'],
                'longitude' => $coords['lng'],
                'current' => 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
                'forecast_days' => 1,
            ]);
        } catch (ConnectionException $e) {
            Log::error('WeatherService: Open-Meteo injoignable', [
                'governorate' => $governorate,
                'error' => $e->getMessage(),
            ]);

            return null;
        } catch (Throwable $e) {
            Log::error('WeatherService: erreur inattendue', [
                'governorate' => $governorate,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if ($response->failed()) {
            Log::error('WeatherService: Open-Meteo a retourné une erreur', [
                'governorate' => $governorate,
                'status' => $response->status(),
            ]);

            return null;
        }

        $current = $response->json('current');

        if (! is_array($current)) {
            Log::error('WeatherService: réponse Open-Meteo inattendue', [
                'governorate' => $governorate,
                'body' => $response->body(),
            ]);

            return null;
        }

        return [
            'temperature' => isset($current['temperature_2m']) ? (float) $current['temperature_2m'] : null,
            'humidity' => isset($current['relative_humidity_2m']) ? (float) $current['relative_humidity_2m'] : null,
            'rainfall' => isset($current['precipitation']) ? (float) $current['precipitation'] : null,
            'wind_speed' => isset($current['wind_speed_10m']) ? (float) $current['wind_speed_10m'] : null,
        ];
    }

    /**
     * Fetch an 8-day daily forecast (today + next 7 days) for a Tunisian
     * governorate via Open-Meteo, used to feed the risk model day by day.
     *
     * Never throws: on any failure it logs the issue and returns null.
     *
     * @return array<int, array{date: string, temperature: ?float, humidity: ?float, rainfall: ?float, wind_speed: ?float}>|null
     *         Indexed by offset 0 (today) through 7.
     */
    public function getDailyForecastForGovernorate(string $governorate): ?array
    {
        $coords = config('tunisia.governorates')[$governorate] ?? null;

        if (! $coords) {
            Log::warning('WeatherService: gouvernorat introuvable', ['governorate' => $governorate]);

            return null;
        }

        try {
            $response = Http::timeout(5)->get(self::BASE_URL, [
                'latitude' => $coords['lat'],
                'longitude' => $coords['lng'],
                // relative_humidity_2m_mean and temperature_2m_mean are genuine
                // Open-Meteo daily aggregates (verified against the live API) —
                // no need to derive them from hourly data ourselves.
                'daily' => 'temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max',
                'forecast_days' => 8,
                'timezone' => 'auto',
            ]);
        } catch (ConnectionException $e) {
            Log::error('WeatherService: Open-Meteo injoignable (prévisions)', [
                'governorate' => $governorate,
                'error' => $e->getMessage(),
            ]);

            return null;
        } catch (Throwable $e) {
            Log::error('WeatherService: erreur inattendue (prévisions)', [
                'governorate' => $governorate,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        if ($response->failed()) {
            Log::error('WeatherService: Open-Meteo a retourné une erreur (prévisions)', [
                'governorate' => $governorate,
                'status' => $response->status(),
            ]);

            return null;
        }

        $daily = $response->json('daily');

        if (! is_array($daily) || ! isset($daily['time']) || ! is_array($daily['time'])) {
            Log::error('WeatherService: réponse Open-Meteo inattendue (prévisions)', [
                'governorate' => $governorate,
                'body' => $response->body(),
            ]);

            return null;
        }

        $days = [];

        foreach ($daily['time'] as $offset => $date) {
            $days[$offset] = [
                'date' => $date,
                'temperature' => isset($daily['temperature_2m_mean'][$offset]) ? (float) $daily['temperature_2m_mean'][$offset] : null,
                'humidity' => isset($daily['relative_humidity_2m_mean'][$offset]) ? (float) $daily['relative_humidity_2m_mean'][$offset] : null,
                'rainfall' => isset($daily['precipitation_sum'][$offset]) ? (float) $daily['precipitation_sum'][$offset] : null,
                'wind_speed' => isset($daily['wind_speed_10m_max'][$offset]) ? (float) $daily['wind_speed_10m_max'][$offset] : null,
            ];
        }

        return $days;
    }
}
