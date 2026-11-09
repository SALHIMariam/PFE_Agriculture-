<?php

namespace Tests\Unit;

use App\Models\Analysis;
use App\Models\User;
use App\Services\RiskForecastService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RiskForecastServiceTest extends TestCase
{
    use RefreshDatabase;

    private const DISEASE = 'Tomato__early_blight';
    private const CROP = 'Tomato';
    private const GOVERNORATE = 'Sfax';
    private const ZONE = 'centre';

    private function farmerIn(string $governorate): User
    {
        return User::factory()->create(['governorate' => $governorate]);
    }

    private function analysisFor(User $user, string $predictedClass, int $daysAgo, float $confidence = 0.8): Analysis
    {
        $analysis = Analysis::create([
            'user_id' => $user->id,
            'image_path' => 'x.jpg',
            'status' => 'done',
            'predicted_class' => $predictedClass,
            'crop' => self::CROP,
            'confidence' => $confidence,
        ]);

        // 'created_at' isn't mass-assignable, so Eloquent would silently
        // overwrite it with "now" if passed to create() above — bypass the
        // guard directly to actually backdate the row.
        $analysis->forceFill([
            'created_at' => now()->subDays($daysAgo),
            'updated_at' => now()->subDays($daysAgo),
        ])->save();

        return $analysis->fresh();
    }

    private function fakeOpenMeteoDaily(): array
    {
        $time = [];
        $temp = [];
        $humidity = [];
        $rain = [];
        $wind = [];

        for ($i = 0; $i < 8; $i++) {
            $time[] = now()->addDays($i)->format('Y-m-d');
            $temp[] = 28.0;
            $humidity[] = 60.0;
            $rain[] = 2.0;
            $wind[] = 12.0;
        }

        return ['daily' => [
            'time' => $time,
            'temperature_2m_mean' => $temp,
            'relative_humidity_2m_mean' => $humidity,
            'precipitation_sum' => $rain,
            'wind_speed_10m_max' => $wind,
        ]];
    }

    private function fakeSpreadRisk(int $score = 60): array
    {
        return [
            'risk_score' => $score,
            'risk_level' => 'high',
            'top_factors' => [['factor' => 'Humidité', 'contribution' => 5.1]],
            'confidence' => 0.91,
        ];
    }

    public function test_case_counts_and_growth_rate_sent_to_spread_risk_are_correct(): void
    {
        $farmer = $this->farmerIn(self::GOVERNORATE);

        // 3 cases within the last 7 days, 2 more between day 8 and day 14
        // (previous week), 1 more between day 15 and day 30.
        $this->analysisFor($farmer, self::DISEASE, 1);
        $this->analysisFor($farmer, self::DISEASE, 3);
        $this->analysisFor($farmer, self::DISEASE, 6);
        $this->analysisFor($farmer, self::DISEASE, 9);
        $this->analysisFor($farmer, self::DISEASE, 12);
        $this->analysisFor($farmer, self::DISEASE, 20);

        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => Http::response($this->fakeSpreadRisk(), 200),
        ]);

        app(RiskForecastService::class)->computeDailyForecast(self::DISEASE, self::CROP, self::GOVERNORATE, self::ZONE);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'spread-risk')
                && $request['cases_7d'] === 3
                && $request['cases_14d'] === 5
                && $request['cases_30d'] === 6
                && $request['growth_rate'] === 1.5 // 3 / (5-3)
                && $request['governorate'] === 'Sfax'
                && $request['climate_zone'] === 'Center'; // translated from 'centre'
        });
    }

    public function test_le_kef_and_kebili_are_translated_to_model_governorate_names(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => Http::response($this->fakeSpreadRisk(), 200),
        ]);

        app(RiskForecastService::class)->computeDailyForecast(self::DISEASE, self::CROP, 'Le Kef', 'nord');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'spread-risk') && $request['governorate'] === 'Kef');

        app(RiskForecastService::class)->computeDailyForecast(self::DISEASE, self::CROP, 'Kebili', 'sud');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'spread-risk') && $request['governorate'] === 'Kébili');
    }

    public function test_nearby_cases_averages_across_neighbor_governorates(): void
    {
        // Sfax neighbors: Mahdia, Kairouan, Sidi Bouzid, Gabès.
        $this->analysisFor($this->farmerIn('Mahdia'), self::DISEASE, 2);
        $this->analysisFor($this->farmerIn('Mahdia'), self::DISEASE, 3);
        $this->analysisFor($this->farmerIn('Kairouan'), self::DISEASE, 4);
        // Not a neighbor of Sfax — must not count.
        $this->analysisFor($this->farmerIn('Tunis'), self::DISEASE, 1);

        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => Http::response($this->fakeSpreadRisk(), 200),
        ]);

        app(RiskForecastService::class)->computeDailyForecast(self::DISEASE, self::CROP, self::GOVERNORATE, self::ZONE);

        // (2 + 1 + 0 + 0) / 4 neighbors = 0.75
        Http::assertSent(fn ($request) => str_contains($request->url(), 'spread-risk') && $request['nearby_cases'] === 0.75);
    }

    public function test_result_is_cached_by_disease_and_governorate_not_recomputed(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => Http::response($this->fakeSpreadRisk(), 200),
        ]);

        $service = app(RiskForecastService::class);

        $first = $service->computeDailyForecast(self::DISEASE, self::CROP, self::GOVERNORATE, self::ZONE);
        Http::assertSentCount(9); // 1 weather call + 8 spread-risk calls (offsets 0-7)

        // A second farmer, same disease + governorate: must hit the cache,
        // not trigger new HTTP calls at all.
        $second = $service->computeDailyForecast(self::DISEASE, self::CROP, self::GOVERNORATE, self::ZONE);
        Http::assertSentCount(9);

        $this->assertSame($first, $second);
    }

    public function test_different_governorate_is_not_served_from_the_other_ones_cache(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => Http::response($this->fakeSpreadRisk(), 200),
        ]);

        $service = app(RiskForecastService::class);
        $service->computeDailyForecast(self::DISEASE, self::CROP, 'Sfax', 'centre');
        Http::assertSentCount(9);

        $service->computeDailyForecast(self::DISEASE, self::CROP, 'Nabeul', 'nord');
        Http::assertSentCount(18);
    }

    public function test_a_failing_spread_risk_call_nulls_only_that_day_not_the_whole_forecast(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => Http::sequence()
                ->push($this->fakeSpreadRisk(40), 200)
                ->push(['detail' => 'boom'], 500) // day offset 1 fails
                ->push($this->fakeSpreadRisk(45), 200)
                ->push($this->fakeSpreadRisk(50), 200)
                ->push($this->fakeSpreadRisk(55), 200)
                ->push($this->fakeSpreadRisk(60), 200)
                ->push($this->fakeSpreadRisk(65), 200)
                ->push($this->fakeSpreadRisk(70), 200),
        ]);

        $result = app(RiskForecastService::class)->computeDailyForecast(self::DISEASE, self::CROP, self::GOVERNORATE, self::ZONE);

        $this->assertCount(8, $result['days']);
        $this->assertSame(40, $result['days'][0]['risk_score']);
        $this->assertNull($result['days'][1]['risk_score']);
        $this->assertNull($result['days'][1]['risk_level']);
        $this->assertSame(45, $result['days'][2]['risk_score']);
        $this->assertSame(70, $result['days'][7]['risk_score']);

        // trend/alert still computed from the days that did succeed (0 and 7).
        $this->assertSame(30, $result['trend']);
        $this->assertTrue($result['alert']);
    }

    public function test_weather_unavailable_nulls_every_day_without_throwing(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response(['error' => true], 500),
        ]);

        $result = app(RiskForecastService::class)->computeDailyForecast(self::DISEASE, self::CROP, self::GOVERNORATE, self::ZONE);

        $this->assertCount(8, $result['days']);
        foreach ($result['days'] as $day) {
            $this->assertNull($day['risk_score']);
        }
        $this->assertNull($result['trend']);
        $this->assertFalse($result['alert']);
    }

    public function test_get_forecast_for_user_returns_null_without_governorate(): void
    {
        $user = User::factory()->create(['governorate' => null]);

        $result = app(RiskForecastService::class)->getForecastForUser($user);

        $this->assertNull($result);
    }

    public function test_get_forecast_for_user_returns_null_without_any_disease_analysis(): void
    {
        $user = $this->farmerIn(self::GOVERNORATE);
        $this->analysisFor($user, 'Tomato__healthy', 1);

        $result = app(RiskForecastService::class)->getForecastForUser($user);

        $this->assertNull($result);
    }

    public function test_get_forecast_for_user_uses_the_latest_non_healthy_analysis(): void
    {
        $user = $this->farmerIn(self::GOVERNORATE);
        $this->analysisFor($user, 'Potato__late_blight', 10);
        $this->analysisFor($user, self::DISEASE, 1); // most recent, non-healthy
        $this->analysisFor($user, 'Tomato__healthy', 0);

        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => Http::response($this->fakeSpreadRisk(), 200),
        ]);

        $result = app(RiskForecastService::class)->getForecastForUser($user);

        $this->assertNotNull($result);
        $this->assertSame(self::DISEASE, $result['disease']);
        $this->assertSame(self::GOVERNORATE, $result['governorate']);
    }
}
