<?php

namespace Tests\Feature\Admin;

use App\Models\Analysis;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminAnalysisSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'farmer'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    private function farmer(string $first, string $last): User
    {
        $user = User::factory()->create(['first_name' => $first, 'last_name' => $last]);
        $user->assignRole('farmer');

        return $user;
    }

    private function analysis(User $farmer, array $attrs = []): Analysis
    {
        return Analysis::create(array_merge([
            'user_id'         => $farmer->id,
            'image_path'      => 'analyses/'.$farmer->id.'/leaf.jpg',
            'status'          => 'done',
            'predicted_class' => 'Tomato__late_blight',
            'confidence'      => 0.90,
        ], $attrs));
    }

    public function test_search_by_partial_diagnostic_returns_matching_analyses(): void
    {
        $admin = $this->admin();
        $farmer = $this->farmer('Mouna', 'Ben Salah');

        $this->analysis($farmer, ['predicted_class' => 'Potato__early_blight']);
        $this->analysis($farmer, ['predicted_class' => 'Potato__late_blight']);
        $this->analysis($farmer, ['predicted_class' => 'Tomato__leaf_mold']);

        $response = $this->actingAs($admin)->getJson('/api/admin/analyses?search=potato');

        $response->assertOk();
        $classes = collect($response->json('data'))->pluck('predicted_class')->all();

        $this->assertCount(2, $classes);
        $this->assertEqualsCanonicalizing(
            ['Potato__early_blight', 'Potato__late_blight'],
            $classes
        );
    }

    public function test_filter_by_farmer_name_returns_only_that_farmers_analyses(): void
    {
        $admin = $this->admin();
        $mouna = $this->farmer('Mouna', 'Trabelsi');
        $karim = $this->farmer('Karim', 'Haddad');

        $this->analysis($mouna);
        $this->analysis($mouna);
        $this->analysis($karim);

        $response = $this->actingAs($admin)->getJson('/api/admin/analyses?farmer=mouna');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('farmer_name')->unique()->values()->all();

        $this->assertSame(['Mouna Trabelsi'], $names);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_confidence_min_filter_excludes_low_confidence(): void
    {
        $admin = $this->admin();
        $farmer = $this->farmer('Sami', 'Louati');

        $this->analysis($farmer, ['confidence' => 0.55]);
        $this->analysis($farmer, ['confidence' => 0.80]);
        $this->analysis($farmer, ['confidence' => 0.95]);

        $response = $this->actingAs($admin)->getJson('/api/admin/analyses?confidence_min=80');

        $response->assertOk();
        $confidences = collect($response->json('data'))->pluck('confidence')->all();

        $this->assertCount(2, $confidences);
        foreach ($confidences as $c) {
            $this->assertGreaterThanOrEqual(0.80, $c);
        }
    }

    public function test_date_range_filter_returns_only_analyses_within_range(): void
    {
        $admin = $this->admin();
        $farmer = $this->farmer('Nadia', 'Gharbi');

        $this->analysis($farmer)->forceFill(['created_at' => '2026-07-15 10:00:00'])->save();
        $inRange = $this->analysis($farmer);
        $inRange->forceFill(['created_at' => '2026-08-10 10:00:00'])->save();
        $this->analysis($farmer)->forceFill(['created_at' => '2026-09-05 10:00:00'])->save();

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/analyses?date_from=2026-08-01&date_to=2026-08-31');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertSame($inRange->id, $data[0]['id']);
    }

    // ------------------------------------------------ ordre : dernière activité

    private function idsInOrder(User $admin): array
    {
        return collect($this->actingAs($admin)->getJson('/api/admin/analyses')->assertOk()->json('data'))
            ->pluck('id')
            ->all();
    }

    public function test_most_recent_analysis_is_listed_first(): void
    {
        $admin = $this->admin();
        $farmer = $this->farmer('Ali', 'Ben');

        $old = $this->analysis($farmer);
        $old->forceFill(['created_at' => now()->subDays(3)])->saveQuietly();
        $new = $this->analysis($farmer);

        $this->assertSame([$new->id, $old->id], $this->idsInOrder($admin));
    }

    public function test_validating_or_rejecting_an_old_analysis_moves_it_to_the_top(): void
    {
        $admin = $this->admin();
        $farmer = $this->farmer('Ali', 'Ben');

        $validated = $this->analysis($farmer);
        $validated->forceFill(['created_at' => now()->subDays(5)])->saveQuietly();
        $rejected = $this->analysis($farmer);
        $rejected->forceFill(['created_at' => now()->subDays(4)])->saveQuietly();
        $recent = $this->analysis($farmer);
        $recent->forceFill(['created_at' => now()->subHour()])->saveQuietly();

        $this->travel(1)->minutes();
        $this->actingAs($admin)->postJson("/api/copilot/{$validated->id}/respond", ['action' => 'validate'])->assertOk();
        $this->assertSame([$validated->id, $recent->id, $rejected->id], $this->idsInOrder($admin));

        $this->travel(1)->minutes();
        $this->actingAs($admin)->postJson("/api/copilot/{$rejected->id}/respond", ['action' => 'reject'])->assertOk();
        $this->assertSame([$rejected->id, $validated->id, $recent->id], $this->idsInOrder($admin));
    }

    public function test_technical_updates_do_not_reorder_the_list(): void
    {
        $admin = $this->admin();
        $farmer = $this->farmer('Ali', 'Ben');

        $old = $this->analysis($farmer);
        $old->forceFill(['created_at' => now()->subDays(3)])->saveQuietly();
        $new = $this->analysis($farmer);

        // Ex. : brouillon Assistant AI recalculé → updated_at change, pas d'action expert.
        $this->travel(1)->minutes();
        $old->update(['draft_response' => 'Brouillon recalculé']);

        $this->assertSame([$new->id, $old->id], $this->idsInOrder($admin));
    }

    public function test_analyses_with_messages_no_longer_jump_ahead(): void
    {
        $admin = $this->admin();
        $farmer = $this->farmer('Ali', 'Ben');

        $old = $this->analysis($farmer);
        $old->forceFill(['created_at' => now()->subDays(3)])->saveQuietly();
        $old->messages()->create(['user_id' => $farmer->id, 'message' => 'Bonjour']);
        $new = $this->analysis($farmer);

        $this->assertSame([$new->id, $old->id], $this->idsInOrder($admin));
    }
}
