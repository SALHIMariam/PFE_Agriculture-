<?php

namespace Tests\Unit;

use App\Models\Analysis;
use App\Models\User;
use App\Services\RiskRankingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RiskRankingServiceTest extends TestCase
{
    use RefreshDatabase;

    private function farmerIn(string $governorate): User
    {
        return User::factory()->create(['governorate' => $governorate]);
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

        // 'created_at' isn't mass-assignable — bypass the guard to backdate.
        $analysis->forceFill([
            'created_at' => now()->subDays($daysAgo),
            'updated_at' => now()->subDays($daysAgo),
        ])->save();

        return $analysis->fresh();
    }

    private function fakeOpenMeteoDaily(): array
    {
        $time = array_map(fn ($i) => now()->addDays($i)->format('Y-m-d'), range(0, 7));

        return ['daily' => [
            'time' => $time,
            'temperature_2m_mean' => array_fill(0, 8, 28.0),
            'relative_humidity_2m_mean' => array_fill(0, 8, 60.0),
            'precipitation_sum' => array_fill(0, 8, 1.0),
            'wind_speed_10m_max' => array_fill(0, 8, 10.0),
        ]];
    }

    /** Fakes /spread-risk with a deterministic score per (disease, governorate) combo. */
    private function fakeSpreadRiskByCombo(array $scoresByComboKey): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response($this->fakeOpenMeteoDaily(), 200),
            '*/spread-risk' => function (Request $request) use ($scoresByComboKey) {
                $body = $request->data();
                $key = $body['disease'].'|'.$body['governorate'];
                $score = $scoresByComboKey[$key] ?? 5;

                return Http::response([
                    'risk_score' => $score,
                    'risk_level' => 'x',
                    'top_factors' => [],
                    'confidence' => 0.9,
                ], 200);
            },
        ]);
    }

    public function test_returns_combos_sorted_by_risk_score_descending(): void
    {
        $this->analysisFor($this->farmerIn('Sfax'), 'Tomato__early_blight', 'Tomato');
        $this->analysisFor($this->farmerIn('Nabeul'), 'Potato__late_blight', 'Potato');
        $this->analysisFor($this->farmerIn('Bizerte'), 'Grape__black_rot', 'Grape');

        $this->fakeSpreadRiskByCombo([
            'Tomato__early_blight|Sfax' => 40,
            'Potato__late_blight|Nabeul' => 90,
            'Grape__black_rot|Bizerte' => 65,
        ]);

        $top = app(RiskRankingService::class)->getTopRisks(5);

        $this->assertCount(3, $top);
        $this->assertSame('Potato__late_blight', $top[0]['disease']);
        $this->assertSame(90, $top[0]['risk_score']);
        $this->assertSame('Grape__black_rot', $top[1]['disease']);
        $this->assertSame(65, $top[1]['risk_score']);
        $this->assertSame('Tomato__early_blight', $top[2]['disease']);
        $this->assertSame(40, $top[2]['risk_score']);
    }

    public function test_respects_the_limit_parameter(): void
    {
        $governorates = ['Sfax', 'Nabeul', 'Bizerte', 'Tunis', 'Sousse', 'Gabès'];
        foreach ($governorates as $gov) {
            $this->analysisFor($this->farmerIn($gov), 'Tomato__early_blight', 'Tomato');
        }

        $this->fakeSpreadRiskByCombo([]); // everyone gets the default score of 5

        $top = app(RiskRankingService::class)->getTopRisks(3);

        $this->assertCount(3, $top);
    }

    public function test_excludes_healthy_predicted_classes(): void
    {
        $this->analysisFor($this->farmerIn('Sfax'), 'Tomato__healthy', 'Tomato');

        $this->fakeSpreadRiskByCombo([]);

        $top = app(RiskRankingService::class)->getTopRisks(5);

        $this->assertCount(0, $top);
    }

    public function test_excludes_analyses_older_than_30_days(): void
    {
        $this->analysisFor($this->farmerIn('Sfax'), 'Tomato__early_blight', 'Tomato', daysAgo: 45);

        $this->fakeSpreadRiskByCombo([]);

        $top = app(RiskRankingService::class)->getTopRisks(5);

        $this->assertCount(0, $top);
    }

    public function test_returns_empty_array_when_there_is_no_data(): void
    {
        $top = app(RiskRankingService::class)->getTopRisks(5);

        $this->assertSame([], $top);
    }
}
