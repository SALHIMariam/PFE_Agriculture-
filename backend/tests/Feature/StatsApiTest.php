<?php

namespace Tests\Feature;

use App\Models\Analysis;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StatsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
    }

    private function farmer(): User
    {
        $user = User::factory()->create();
        $user->assignRole('farmer');

        return $user;
    }

    public function test_guest_cannot_access_stats_overview(): void
    {
        $response = $this->getJson('/api/stats/overview');
        $response->assertStatus(401);
    }

    public function test_guest_cannot_access_stats_analyses(): void
    {
        $response = $this->getJson('/api/stats/analyses');
        $response->assertStatus(401);
    }

    public function test_guest_cannot_access_ai_summary(): void
    {
        $response = $this->getJson('/api/stats/ai-summary');
        $response->assertStatus(401);
    }

    public function test_farmer_sees_only_his_own_analyses(): void
    {
        $u1 = $this->farmer();
        $u2 = $this->farmer();

        Analysis::create(['user_id' => $u1->id, 'image_path' => 'a.jpg', 'status' => 'done']);
        Analysis::create(['user_id' => $u2->id, 'image_path' => 'b.jpg', 'status' => 'done']);

        $resp = $this->actingAs($u1)->getJson('/api/stats/overview');
        $resp->assertStatus(200);
        $data = $resp->json();
        $this->assertEquals(1, $data['total_analyses']);
    }

    public function test_overview_returns_valid_structure(): void
    {
        $u = $this->farmer();

        $expert = User::factory()->create();
        Analysis::create(['user_id' => $u->id, 'image_path' => 'a.jpg', 'status' => 'done', 'predicted_class' => 'tomato__late_blight', 'crop' => 'Tomato', 'confidence' => 0.86, 'expert_id' => $expert->id, 'expert_validated_at' => now()]);

        $resp = $this->actingAs($u)->getJson('/api/stats/overview');
        $resp->assertStatus(200);
        $resp->assertJsonStructure([
            'farm_performance_index', 'performance_label', 'performance_stars', 'crop_health_score', 'treatment_score', 'ai_accuracy_score', 'expert_agreement_score', 'satisfaction_score', 'ai_conclusion', 'total_analyses', 'analyses_this_week', 'most_analysed_crop', 'disease_distribution'
        ]);
    }

    public function test_farm_performance_index_is_between_0_and_100(): void
    {
        $u = $this->farmer();

        for ($i = 0; $i < 5; $i++) {
            Analysis::create(['user_id' => $u->id, 'image_path' => "a{$i}.jpg", 'status' => 'done', 'predicted_class' => 'tomato__healthy', 'confidence' => 0.9]);
        }

        $resp = $this->actingAs($u)->getJson('/api/stats/overview');
        $resp->assertStatus(200);
        $val = $resp->json('farm_performance_index');
        $this->assertIsInt($val);
        $this->assertGreaterThanOrEqual(0, $val);
        $this->assertLessThanOrEqual(100, $val);
    }

    public function test_farmer_dashboard_requires_auth(): void
    {
        $this->getJson('/api/stats/farmer-dashboard')->assertStatus(401);
    }

    public function test_farmer_dashboard_aggregates_only_own_analyses(): void
    {
        $me = $this->farmer();
        $other = $this->farmer();

        Analysis::create(['user_id' => $me->id, 'image_path' => 'a.jpg', 'status' => 'done',
            'predicted_class' => 'Tomato__Early_blight', 'confidence' => 0.9, 'validation_status' => 'validated']);
        Analysis::create(['user_id' => $me->id, 'image_path' => 'b.jpg', 'status' => 'done',
            'predicted_class' => 'Tomato__Early_blight', 'confidence' => 0.8, 'validation_status' => 'pending']);
        Analysis::create(['user_id' => $me->id, 'image_path' => 'c.jpg', 'status' => 'done',
            'predicted_class' => 'Tomato__healthy', 'confidence' => 0.7, 'validation_status' => 'pending']);
        Analysis::create(['user_id' => $other->id, 'image_path' => 'd.jpg', 'status' => 'done',
            'predicted_class' => 'Potato__Late_blight', 'confidence' => 0.9, 'validation_status' => 'rejected']);

        $resp = $this->actingAs($me)->getJson('/api/stats/farmer-dashboard')->assertOk();

        $resp->assertJsonPath('kpis.total', 3)
            ->assertJsonPath('kpis.last_30_days', 3)
            ->assertJsonPath('kpis.validated', 1)
            ->assertJsonPath('kpis.pending', 2)
            ->assertJsonPath('kpis.rejected', 0)
            ->assertJsonPath('kpis.healthy_percentage', 33)
            ->assertJsonPath('top_diseases.0.disease', 'Alternariose')
            ->assertJsonPath('top_diseases.0.count', 2)
            ->assertJsonCount(1, 'top_diseases')
            ->assertJsonCount(6, 'monthly')
            ->assertJsonCount(3, 'recent');

        $current = collect($resp->json('monthly'))->last();
        $this->assertSame(now()->format('Y-m'), $current['month']);
        $this->assertSame(1, $current['validated']);
        $this->assertSame(2, $current['pending']);
    }
}
