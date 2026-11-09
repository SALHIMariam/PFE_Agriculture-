<?php

namespace Tests\Feature;

use App\Models\Analysis;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'expert', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    private function farmer(): User
    {
        $user = User::factory()->create();
        $user->assignRole('farmer');

        return $user;
    }

    private function expert(): User
    {
        $user = User::factory()->create();
        $user->assignRole('expert');

        return $user;
    }

    private function realLeafImage(): UploadedFile
    {
        $source = base_path('..'.DIRECTORY_SEPARATOR.'ai'.DIRECTORY_SEPARATOR.'dataset_final'.DIRECTORY_SEPARATOR.'test'.DIRECTORY_SEPARATOR.'Tomato__late_blight'.DIRECTORY_SEPARATOR.'Tomato__late_blight_0001.jpg');

        return new UploadedFile($source, 'leaf.jpg', 'image/jpeg', null, true);
    }

    public function test_creating_an_analysis_notifies_every_expert(): void
    {
        Storage::fake('public');
        Http::fake(['*/predict' => Http::response([
            'predicted_class' => 'Tomato__late_blight',
            'confidence' => 0.91,
            'top_k' => [],
            'inference_ms' => 120,
        ], 200)]);

        $expertA = $this->expert();
        $expertB = $this->expert();

        $this->actingAs($this->farmer())
            ->postJson('/api/analyses', ['image' => $this->realLeafImage()])
            ->assertStatus(201);

        $this->assertSame(1, Notification::where('user_id', $expertA->id)->where('type', 'new_analysis')->count());
        $this->assertSame(1, Notification::where('user_id', $expertB->id)->where('type', 'new_analysis')->count());
    }

    public function test_farmer_message_notifies_experts_and_expert_reply_notifies_farmer(): void
    {
        $owner = $this->farmer();
        $expert = $this->expert();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $this->actingAs($owner)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'Un avis ?'])
            ->assertStatus(201);

        $this->assertSame(1, Notification::where('user_id', $expert->id)->where('type', 'new_message')->count());

        $this->actingAs($expert)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'Je regarde.'])
            ->assertStatus(201);

        $this->assertSame(1, Notification::where('user_id', $owner->id)->where('type', 'expert_reply')->count());
    }

    public function test_validating_and_rejecting_notify_the_farmer(): void
    {
        $owner = $this->farmer();
        $expert = $this->expert();

        $validated = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);
        $this->actingAs($expert)
            ->patchJson("/api/analyses/{$validated->id}/validate", ['status' => 'validated'])
            ->assertStatus(200);

        $this->assertSame(1, Notification::where('user_id', $owner->id)->where('type', 'analysis_validated')->count());

        $rejected = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/2/leaf.jpg',
            'status' => 'done',
        ]);
        $this->actingAs($expert)
            ->patchJson("/api/analyses/{$rejected->id}/validate", ['status' => 'rejected', 'comment' => 'Pas fiable.'])
            ->assertStatus(200);

        $this->assertSame(1, Notification::where('user_id', $owner->id)->where('type', 'analysis_rejected')->count());
    }

    public function test_notifications_index_returns_own_notifications_with_unread_count(): void
    {
        $user = $this->farmer();
        $other = $this->farmer();

        Notification::create(['user_id' => $user->id, 'type' => 'analysis_validated', 'title' => 'A', 'body' => 'B']);
        Notification::create(['user_id' => $user->id, 'type' => 'analysis_rejected', 'title' => 'C', 'body' => 'D', 'is_read' => true]);
        Notification::create(['user_id' => $other->id, 'type' => 'analysis_validated', 'title' => 'E', 'body' => 'F']);

        $response = $this->actingAs($user)->getJson('/api/notifications');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'notifications');
        $response->assertJsonPath('unread_count', 1);
    }

    public function test_notifications_index_hides_types_disabled_in_preferences(): void
    {
        $user = $this->farmer();
        $user->update(['notification_preferences' => [
            'disease_alerts' => true,
            'high_risk' => false,          // hides "risk_alert"
            'expert_validation' => false,  // hides *validat* + *expert*
            'new_recommendations' => true,
        ]]);

        Notification::create(['user_id' => $user->id, 'type' => 'risk_alert', 'title' => 'R', 'body' => 'b']);
        Notification::create(['user_id' => $user->id, 'type' => 'analysis_validated', 'title' => 'V', 'body' => 'b']);
        Notification::create(['user_id' => $user->id, 'type' => 'expert_reply', 'title' => 'E', 'body' => 'b']);
        Notification::create(['user_id' => $user->id, 'type' => 'reco_validated', 'title' => 'RV', 'body' => 'b']);
        Notification::create(['user_id' => $user->id, 'type' => 'new_message', 'title' => 'M', 'body' => 'b']);

        $response = $this->actingAs($user)->getJson('/api/notifications');

        $response->assertStatus(200);
        // reco_validated matches "reco" but new_recommendations is ON → kept.
        // new_message matches nothing → kept.
        $types = collect($response->json('notifications'))->pluck('type')->sort()->values()->all();
        $this->assertSame(['new_message', 'reco_validated'], $types);
        $response->assertJsonPath('unread_count', 2);
    }

    public function test_notifications_index_shows_everything_by_default(): void
    {
        $user = $this->farmer();
        Notification::create(['user_id' => $user->id, 'type' => 'risk_alert', 'title' => 'R', 'body' => 'b']);
        Notification::create(['user_id' => $user->id, 'type' => 'analysis_validated', 'title' => 'V', 'body' => 'b']);

        $this->actingAs($user)->getJson('/api/notifications')
            ->assertStatus(200)
            ->assertJsonCount(2, 'notifications');
    }

    public function test_user_can_mark_a_notification_as_read(): void
    {
        $user = $this->farmer();
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'analysis_validated',
            'title' => 'A',
            'body' => 'B',
        ]);

        $response = $this->actingAs($user)->patchJson("/api/notifications/{$notification->id}/read");

        $response->assertStatus(200);
        $response->assertJsonPath('notification.is_read', true);
    }

    public function test_user_can_mark_all_notifications_as_read(): void
    {
        $user = $this->farmer();
        Notification::create(['user_id' => $user->id, 'type' => 'analysis_validated', 'title' => 'A', 'body' => 'B']);
        Notification::create(['user_id' => $user->id, 'type' => 'analysis_rejected', 'title' => 'C', 'body' => 'D']);

        $this->actingAs($user)->patchJson('/api/notifications/read-all')->assertStatus(200);

        $this->assertSame(0, Notification::where('user_id', $user->id)->where('is_read', false)->count());
    }

    public function test_user_can_delete_their_own_notification(): void
    {
        $user = $this->farmer();
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'analysis_validated',
            'title' => 'A',
            'body' => 'B',
        ]);

        $this->actingAs($user)->deleteJson("/api/notifications/{$notification->id}")->assertStatus(200);

        $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
    }

    public function test_user_cannot_read_or_delete_another_users_notification(): void
    {
        $owner = $this->farmer();
        $intruder = $this->farmer();
        $notification = Notification::create([
            'user_id' => $owner->id,
            'type' => 'analysis_validated',
            'title' => 'A',
            'body' => 'B',
        ]);

        $this->actingAs($intruder)->patchJson("/api/notifications/{$notification->id}/read")->assertStatus(403);
        $this->actingAs($intruder)->deleteJson("/api/notifications/{$notification->id}")->assertStatus(403);
    }

    public function test_notifications_index_paginates_when_page_is_given(): void
    {
        $user = $this->farmer();
        foreach (range(1, 25) as $i) {
            Notification::create(['user_id' => $user->id, 'type' => 'analysis_validated', 'title' => "N{$i}", 'body' => 'x']);
        }

        $this->actingAs($user)->getJson('/api/notifications?page=2&per_page=10')
            ->assertOk()
            ->assertJsonCount(10, 'notifications')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.total', 25);

        // Sans `page` : comportement historique de la cloche, pas de meta.
        $this->actingAs($user)->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(25, 'notifications')
            ->assertJsonMissingPath('meta');
    }

    public function test_notifications_index_filters_by_status_and_category(): void
    {
        $user = $this->farmer();
        Notification::create(['user_id' => $user->id, 'type' => 'risk_alert', 'title' => 'Alerte', 'body' => 'x']);
        Notification::create(['user_id' => $user->id, 'type' => 'risk_alert', 'title' => 'Alerte lue', 'body' => 'x', 'is_read' => true]);
        Notification::create(['user_id' => $user->id, 'type' => 'expert_reply', 'title' => 'Message', 'body' => 'x']);
        Notification::create(['user_id' => $user->id, 'type' => 'analysis_validated', 'title' => 'Analyse', 'body' => 'x']);

        $this->actingAs($user)->getJson('/api/notifications?page=1&category=alerts')
            ->assertJsonPath('meta.total', 2);

        $this->actingAs($user)->getJson('/api/notifications?page=1&category=alerts&status=unread')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('notifications.0.title', 'Alerte');

        $this->actingAs($user)->getJson('/api/notifications?page=1&category=messages')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('notifications.0.title', 'Message');

        $this->actingAs($user)->getJson('/api/notifications?page=1&category=bogus')
            ->assertStatus(422);
    }
}
