<?php

namespace Tests\Feature;

use App\Models\Analysis;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RiskEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'expert', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    private function farmer(?string $governorate = 'Sfax'): User
    {
        $user = User::factory()->create(['governorate' => $governorate]);
        $user->assignRole('farmer');

        return $user;
    }

    private function expert(): User
    {
        $user = User::factory()->create();
        $user->assignRole('expert');

        return $user;
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    private function analysisFor(User $user, string $predictedClass, string $crop, int $daysAgo = 1): Analysis
    {
        $analysis = Analysis::create([
            'user_id' => $user->id,
            'image_path' => 'x.jpg',
            'status' => 'done',
            'predicted_class' => $predictedClass,
            'crop' => $crop,
            'confidence' => 0.8,
        ]);
        $analysis->forceFill(['created_at' => now()->subDays($daysAgo)])->save();

        return $analysis;
    }

    private function fakeWeatherAndRisk(int $score): void
    {
        $time = array_map(fn ($i) => now()->addDays($i)->format('Y-m-d'), range(0, 7));

        Http::fake([
            'api.open-meteo.com/*' => Http::response(['daily' => [
                'time' => $time,
                'temperature_2m_mean' => array_fill(0, 8, 28.0),
                'relative_humidity_2m_mean' => array_fill(0, 8, 60.0),
                'precipitation_sum' => array_fill(0, 8, 1.0),
                'wind_speed_10m_max' => array_fill(0, 8, 10.0),
            ]], 200),
            '*/spread-risk' => Http::response([
                'risk_score' => $score,
                'risk_level' => 'high',
                'top_factors' => [['factor' => 'Humidité', 'contribution' => 4.2]],
                'confidence' => 0.9,
            ], 200),
        ]);
    }

    // ---------------------------------------------------------- /risk-forecast

    public function test_guest_cannot_access_risk_forecast(): void
    {
        $this->getJson('/api/risk-forecast')->assertStatus(401);
    }

    public function test_non_farmer_cannot_access_risk_forecast(): void
    {
        $this->actingAs($this->expert())->getJson('/api/risk-forecast')->assertStatus(403);
    }

    public function test_farmer_without_governorate_gets_available_false_not_an_error(): void
    {
        $farmer = $this->farmer(governorate: null);

        $response = $this->actingAs($farmer)->getJson('/api/risk-forecast');

        $response->assertStatus(200);
        $response->assertJson(['available' => false]);
    }

    public function test_farmer_with_disease_forecast_gets_full_payload(): void
    {
        $farmer = $this->farmer('Sfax');
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato');
        $this->fakeWeatherAndRisk(72);

        $response = $this->actingAs($farmer)->getJson('/api/risk-forecast');

        $response->assertStatus(200);
        $response->assertJson([
            'available' => true,
            'disease' => 'Tomato__early_blight',
            'crop' => 'Tomato',
            'governorate' => 'Sfax',
            'alert' => true,
        ]);
        $response->assertJsonCount(8, 'days');
    }

    // --------------------------------------------------- /risk-forecast/calendar

    public function test_guest_cannot_access_risk_calendar(): void
    {
        $this->getJson('/api/risk-forecast/calendar')->assertStatus(401);
    }

    public function test_calendar_returns_french_day_names_and_alert_day(): void
    {
        $farmer = $this->farmer('Sfax');
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato');
        $this->fakeWeatherAndRisk(85);

        $response = $this->actingAs($farmer)->getJson('/api/risk-forecast/calendar');

        $response->assertStatus(200);
        $response->assertJsonCount(7, 'days'); // offsets 1-7 only
        $response->assertJsonPath('days.0.offset', 1);
        $response->assertJsonPath('days.6.offset', 7);

        $dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        foreach ($response->json('days') as $day) {
            $this->assertContains($day['day_name'], $dayNames);
        }

        $response->assertJsonPath('alert_day.risk_score', 85);
    }

    public function test_calendar_available_false_without_disease_history(): void
    {
        $farmer = $this->farmer('Sfax');

        $response = $this->actingAs($farmer)->getJson('/api/risk-forecast/calendar');

        $response->assertStatus(200);
        $response->assertJson(['available' => false]);
    }

    // --------------------------------------------------------- /admin/risk-top

    public function test_guest_cannot_access_admin_risk_top(): void
    {
        $this->getJson('/api/admin/risk-top')->assertStatus(401);
    }

    public function test_farmer_cannot_access_admin_risk_top(): void
    {
        $this->actingAs($this->farmer())->getJson('/api/admin/risk-top')->assertStatus(403);
    }

    public function test_admin_sees_available_false_with_no_data(): void
    {
        $response = $this->actingAs($this->admin())->getJson('/api/admin/risk-top');

        $response->assertStatus(200);
        $response->assertJson(['available' => false, 'risks' => []]);
    }

    public function test_admin_sees_top_risks_when_data_exists(): void
    {
        $farmer = $this->farmer('Sfax');
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato');
        $this->fakeWeatherAndRisk(77);

        $response = $this->actingAs($this->admin())->getJson('/api/admin/risk-top');

        $response->assertStatus(200);
        $response->assertJson(['available' => true]);
        $response->assertJsonPath('risks.0.disease', 'Tomato__early_blight');
        $response->assertJsonPath('risks.0.risk_score', 77);
    }

    // ------------------------------------------------------ /stats/risk-evolution

    public function test_guest_cannot_access_risk_evolution(): void
    {
        $this->getJson('/api/stats/risk-evolution')->assertStatus(401);
    }

    public function test_farmer_risk_evolution_returns_own_scope(): void
    {
        $farmer = $this->farmer('Sfax');
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato');
        $this->fakeWeatherAndRisk(60);

        $response = $this->actingAs($farmer)->getJson('/api/stats/risk-evolution');

        $response->assertStatus(200);
        $response->assertJson([
            'available' => true,
            'scope' => 'single',
            'disease' => 'Tomato__early_blight',
            'governorate' => 'Sfax',
        ]);
        $response->assertJsonPath('day0.risk_score', 60);
        $response->assertJsonPath('day7.risk_score', 60);
    }

    public function test_farmer_risk_evolution_available_false_without_data(): void
    {
        $farmer = $this->farmer('Sfax');

        $response = $this->actingAs($farmer)->getJson('/api/stats/risk-evolution');

        $response->assertStatus(200);
        $response->assertJson(['available' => false]);
    }

    public function test_admin_risk_evolution_with_explicit_params_returns_that_combo(): void
    {
        $this->fakeWeatherAndRisk(50);

        $response = $this->actingAs($this->admin())->getJson(
            '/api/stats/risk-evolution?governorate=Nabeul&disease=Potato__late_blight'
        );

        $response->assertStatus(200);
        $response->assertJson([
            'available' => true,
            'scope' => 'single',
            'disease' => 'Potato__late_blight',
            'crop' => 'Potato',
            'governorate' => 'Nabeul',
        ]);
    }

    public function test_admin_risk_evolution_without_params_aggregates_top_5(): void
    {
        $farmer = $this->farmer('Sfax');
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato');
        $this->fakeWeatherAndRisk(66);

        $response = $this->actingAs($this->admin())->getJson('/api/stats/risk-evolution');

        $response->assertStatus(200);
        $response->assertJson(['available' => true, 'scope' => 'aggregate_top5']);
        $response->assertJsonPath('day7.risk_score', 66);
    }

    public function test_admin_risk_evolution_available_false_with_no_data_at_all(): void
    {
        $response = $this->actingAs($this->admin())->getJson('/api/stats/risk-evolution');

        $response->assertStatus(200);
        $response->assertJson(['available' => false]);
    }

    public function test_farmer_risk_evolution_with_disease_param_forecasts_that_disease(): void
    {
        $farmer = $this->farmer('Nabeul');
        // Their most recent analysis is a different disease — the param must win.
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato');
        $this->fakeWeatherAndRisk(48);

        $response = $this->actingAs($farmer)->getJson(
            '/api/stats/risk-evolution?disease=Potato__late_blight'
        );

        $response->assertStatus(200);
        $response->assertJson([
            'available' => true,
            'scope' => 'single',
            'disease' => 'Potato__late_blight',
            'crop' => 'Potato',
            'governorate' => 'Nabeul',
        ]);
        $response->assertJsonPath('day7.risk_score', 48);
        $response->assertJsonCount(8, 'days');
    }

    public function test_farmer_risk_evolution_with_malformed_disease_param_is_available_false(): void
    {
        $farmer = $this->farmer('Sfax');

        $response = $this->actingAs($farmer)->getJson('/api/stats/risk-evolution?disease=notadisease');

        $response->assertStatus(200);
        $response->assertJson(['available' => false]);
    }

    // -------------------------------------------------- /risk-forecast/diseases

    public function test_guest_cannot_access_region_diseases(): void
    {
        $this->getJson('/api/risk-forecast/diseases')->assertStatus(401);
    }

    public function test_non_farmer_cannot_access_region_diseases(): void
    {
        $this->actingAs($this->admin())->getJson('/api/risk-forecast/diseases')->assertStatus(403);
    }

    public function test_region_diseases_lists_every_governorate_disease_sorted_by_cases(): void
    {
        $farmer = $this->farmer('Sfax');
        $neighbourInSfax = $this->farmer('Sfax');
        $farmerElsewhere = $this->farmer('Nabeul');

        // Sfax — 3× early blight (one from another Sfax farmer)
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato');
        $this->analysisFor($farmer, 'Tomato__early_blight', 'Tomato', daysAgo: 5);
        $this->analysisFor($neighbourInSfax, 'Tomato__early_blight', 'Tomato', daysAgo: 10);
        // Sfax — 2× black rot
        $this->analysisFor($farmer, 'Grape__black_rot', 'Grape', daysAgo: 3);
        $this->analysisFor($neighbourInSfax, 'Grape__black_rot', 'Grape', daysAgo: 12);
        // Sfax — 1× angular leaf spot
        $this->analysisFor($neighbourInSfax, 'Bean__beans_angular_leaf_spot_disease', 'Bean', daysAgo: 8);
        // Excluded: healthy, out of governorate, older than 30 days
        $this->analysisFor($farmer, 'Tomato__healthy', 'Tomato');
        $this->analysisFor($farmerElsewhere, 'Tomato__early_blight', 'Tomato');
        $this->analysisFor($farmer, 'Grape__black_rot', 'Grape', daysAgo: 40);

        $response = $this->actingAs($farmer)->getJson('/api/risk-forecast/diseases');

        $response->assertStatus(200);
        $response->assertJson([
            'available' => true,
            'governorate' => 'Sfax',
        ]);
        $response->assertJsonCount(3, 'diseases');
        $response->assertJsonPath('diseases.0', ['disease' => 'Tomato__early_blight', 'crop' => 'Tomato', 'cases_30d' => 3]);
        $response->assertJsonPath('diseases.1', ['disease' => 'Grape__black_rot', 'crop' => 'Grape', 'cases_30d' => 2]);
        $response->assertJsonPath('diseases.2', ['disease' => 'Bean__beans_angular_leaf_spot_disease', 'crop' => 'Bean', 'cases_30d' => 1]);
    }

    public function test_region_diseases_available_false_without_governorate(): void
    {
        $farmer = $this->farmer(governorate: null);

        $response = $this->actingAs($farmer)->getJson('/api/risk-forecast/diseases');

        $response->assertStatus(200);
        $response->assertJson(['available' => false]);
    }

    // ------------------------------------------- CNN → modèle de risque (noms)

    public function test_cnn_disease_alias_is_translated_before_calling_the_risk_model(): void
    {
        $farmer = $this->farmer('Béja');
        $this->fakeWeatherAndRisk(52);

        $response = $this->actingAs($farmer)->getJson(
            '/api/stats/risk-evolution?disease=Tomato__spider_mites'
        );

        $response->assertOk()
            ->assertJsonPath('disease', 'Tomato__spider_mites')
            ->assertJsonPath('day0.risk_score', 52)
            ->assertJsonPath('unsupported', false);

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/spread-risk')
            && $r['disease'] === 'Tomato__spider_mites_two_spotted_spider_mite');
        Http::assertNotSent(fn (Request $r) => str_ends_with($r->url(), '/spread-risk')
            && $r['disease'] === 'Tomato__spider_mites');
    }

    public function test_unsupported_disease_skips_the_risk_model_and_is_flagged(): void
    {
        $farmer = $this->farmer('Béja');
        $this->fakeWeatherAndRisk(52);

        $response = $this->actingAs($farmer)->getJson(
            '/api/stats/risk-evolution?disease=Tomato__leaf_mold'
        );

        $response->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('unsupported', true)
            ->assertJsonPath('day0.risk_score', null);

        Http::assertNotSent(fn (Request $r) => str_ends_with($r->url(), '/spread-risk'));
    }

    public function test_failed_forecast_is_not_cached(): void
    {
        $farmer = $this->farmer('Béja');
        Http::fake(['*' => Http::response('down', 503)]);

        $this->actingAs($farmer)
            ->getJson('/api/stats/risk-evolution?disease=Corn__gray_leaf_spot')
            ->assertJsonPath('day0.risk_score', null);

        $this->assertNull(Cache::get('risk_forecast:Corn__gray_leaf_spot:Béja'));
    }
}
