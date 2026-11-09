<?php

namespace Tests\Feature;

use App\Models\Analysis;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AnalysisWeatherIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'expert', 'guard_name' => 'web']);
    }

    private function farmer(string $governorate = 'Sfax'): User
    {
        $user = User::factory()->create(['governorate' => $governorate]);
        $user->assignRole('farmer');

        return $user;
    }

    private function realLeafImage(string $name = 'leaf.jpg'): UploadedFile
    {
        $source = base_path('..'.DIRECTORY_SEPARATOR.'ai'.DIRECTORY_SEPARATOR.'dataset_final'.DIRECTORY_SEPARATOR.'test'.DIRECTORY_SEPARATOR.'Tomato__late_blight'.DIRECTORY_SEPARATOR.'Tomato__late_blight_0001.jpg');

        return new UploadedFile($source, $name, 'image/jpeg', null, true);
    }

    private function fakeAiResponse(array $overrides = []): array
    {
        return array_merge([
            'predicted_class' => 'Tomato__late_blight',
            'predicted_index' => 32,
            'confidence' => 0.9412,
            'low_confidence' => false,
            'top_k' => [
                ['class' => 'Tomato__late_blight', 'confidence' => 0.9412],
            ],
            'inference_ms' => 187,
            'gradcam_base64' => null,
            'gradcam_ms' => 0,
        ], $overrides);
    }

    private function fakeWeatherResponse(array $overrides = []): array
    {
        return [
            'current' => array_merge([
                'temperature_2m' => 31.5,
                'relative_humidity_2m' => 48,
                'precipitation' => 0.0,
                'wind_speed_10m' => 12.3,
            ], $overrides),
        ];
    }

    public function test_weather_columns_are_filled_after_a_successful_analysis(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(), 200),
            'api.open-meteo.com/*' => Http::response($this->fakeWeatherResponse(), 200),
        ]);

        $response = $this->actingAs($this->farmer('Sfax'))->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(201);

        $analysis = Analysis::first();
        $this->assertNotNull($analysis);
        $this->assertSame(31.5, $analysis->temperature);
        $this->assertSame(48.0, $analysis->humidity);
        $this->assertSame(0.0, $analysis->rainfall);
        $this->assertSame(12.3, $analysis->wind_speed);
        $this->assertNotNull($analysis->weather_fetched_at);
    }

    public function test_analysis_still_succeeds_when_the_weather_api_is_unavailable(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(), 200),
            'api.open-meteo.com/*' => Http::response(['error' => true], 500),
        ]);

        $response = $this->actingAs($this->farmer('Sfax'))->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('analysis.status', 'done');

        $analysis = Analysis::first();
        $this->assertNotNull($analysis);
        $this->assertSame('done', $analysis->status);
        $this->assertNull($analysis->temperature);
        $this->assertNull($analysis->humidity);
        $this->assertNull($analysis->weather_fetched_at);
    }

    public function test_no_weather_is_fetched_when_the_farmer_has_no_governorate(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(), 200),
            'api.open-meteo.com/*' => Http::response($this->fakeWeatherResponse(), 200),
        ]);

        $farmer = User::factory()->create(['governorate' => null]);
        $farmer->assignRole('farmer');

        $this->actingAs($farmer)->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ])->assertStatus(201);

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'open-meteo.com'));

        $this->assertNull(Analysis::first()->temperature);
    }
}
