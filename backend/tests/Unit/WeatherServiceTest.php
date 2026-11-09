<?php

namespace Tests\Unit;

use App\Services\WeatherService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WeatherServiceTest extends TestCase
{
    public function test_it_parses_a_valid_open_meteo_response(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response([
                'current' => [
                    'temperature_2m' => 27.4,
                    'relative_humidity_2m' => 58,
                    'precipitation' => 0.0,
                    'wind_speed_10m' => 14.2,
                ],
            ], 200),
        ]);

        $weather = (new WeatherService())->getWeatherForGovernorate('Sfax');

        $this->assertSame([
            'temperature' => 27.4,
            'humidity' => 58.0,
            'rainfall' => 0.0,
            'wind_speed' => 14.2,
        ], $weather);
    }

    public function test_it_calls_open_meteo_with_the_governorate_coordinates(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response([
                'current' => [
                    'temperature_2m' => 20.0,
                    'relative_humidity_2m' => 70,
                    'precipitation' => 1.2,
                    'wind_speed_10m' => 10.0,
                ],
            ], 200),
        ]);

        (new WeatherService())->getWeatherForGovernorate('Tunis');

        Http::assertSent(function ($request) {
            return str_starts_with($request->url(), 'https://api.open-meteo.com/v1/forecast')
                && (float) $request['latitude'] === 36.80
                && (float) $request['longitude'] === 10.18;
        });
    }

    public function test_it_returns_null_for_an_unknown_governorate(): void
    {
        $weather = (new WeatherService())->getWeatherForGovernorate('Atlantide');

        $this->assertNull($weather);
    }

    public function test_it_returns_null_when_open_meteo_returns_an_error_status(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response(['error' => true, 'reason' => 'bad request'], 400),
        ]);

        $weather = (new WeatherService())->getWeatherForGovernorate('Sfax');

        $this->assertNull($weather);
    }

    public function test_it_returns_null_on_connection_timeout(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Connection timed out');
        });

        $weather = (new WeatherService())->getWeatherForGovernorate('Sfax');

        $this->assertNull($weather);
    }

    public function test_it_returns_null_when_the_payload_is_unexpected(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response(['unexpected' => 'shape'], 200),
        ]);

        $weather = (new WeatherService())->getWeatherForGovernorate('Sfax');

        $this->assertNull($weather);
    }

    private function fakeDailyForecast(int $days = 8): array
    {
        $time = [];
        $temp = [];
        $humidity = [];
        $rain = [];
        $wind = [];

        for ($i = 0; $i < $days; $i++) {
            $time[] = now()->addDays($i)->format('Y-m-d');
            $temp[] = 25.0 + $i;
            $humidity[] = 60.0 - $i;
            $rain[] = $i % 2 === 0 ? 0.0 : 1.5;
            $wind[] = 10.0 + $i;
        }

        return [
            'daily' => [
                'time' => $time,
                'temperature_2m_mean' => $temp,
                'relative_humidity_2m_mean' => $humidity,
                'precipitation_sum' => $rain,
                'wind_speed_10m_max' => $wind,
            ],
        ];
    }

    public function test_daily_forecast_returns_eight_days_indexed_by_offset(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeDailyForecast(), 200),
        ]);

        $forecast = (new WeatherService())->getDailyForecastForGovernorate('Sfax');

        $this->assertNotNull($forecast);
        $this->assertCount(8, $forecast);
        $this->assertSame(array_keys($forecast), range(0, 7));

        $this->assertSame(25.0, $forecast[0]['temperature']);
        $this->assertSame(60.0, $forecast[0]['humidity']);
        $this->assertSame(0.0, $forecast[0]['rainfall']);
        $this->assertSame(10.0, $forecast[0]['wind_speed']);
        $this->assertArrayHasKey('date', $forecast[0]);

        $this->assertSame(32.0, $forecast[7]['temperature']);
    }

    public function test_daily_forecast_requests_eight_days_with_daily_aggregates(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeDailyForecast(), 200),
        ]);

        (new WeatherService())->getDailyForecastForGovernorate('Nabeul');

        Http::assertSent(function ($request) {
            return (int) $request['forecast_days'] === 8
                && str_contains($request['daily'], 'temperature_2m_mean')
                && str_contains($request['daily'], 'relative_humidity_2m_mean')
                && str_contains($request['daily'], 'precipitation_sum')
                && str_contains($request['daily'], 'wind_speed_10m_max');
        });
    }

    public function test_daily_forecast_returns_null_for_an_unknown_governorate(): void
    {
        $forecast = (new WeatherService())->getDailyForecastForGovernorate('Atlantide');

        $this->assertNull($forecast);
    }

    public function test_daily_forecast_returns_null_on_error(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response(['error' => true], 500),
        ]);

        $forecast = (new WeatherService())->getDailyForecastForGovernorate('Sfax');

        $this->assertNull($forecast);
    }

    public function test_daily_forecast_returns_null_on_connection_timeout(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Connection timed out');
        });

        $forecast = (new WeatherService())->getDailyForecastForGovernorate('Sfax');

        $this->assertNull($forecast);
    }

    public function test_daily_forecast_returns_null_when_payload_is_unexpected(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response(['unexpected' => 'shape'], 200),
        ]);

        $forecast = (new WeatherService())->getDailyForecastForGovernorate('Sfax');

        $this->assertNull($forecast);
    }
}
