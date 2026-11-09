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

class AnalysisTest extends TestCase
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

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    private function realLeafImage(string $name = 'leaf.jpg'): UploadedFile
    {
        $source = base_path('..'.DIRECTORY_SEPARATOR.'ai'.DIRECTORY_SEPARATOR.'dataset_final'.DIRECTORY_SEPARATOR.'test'.DIRECTORY_SEPARATOR.'Tomato__late_blight'.DIRECTORY_SEPARATOR.'Tomato__late_blight_0001.jpg');

        return new UploadedFile($source, $name, 'image/jpeg', null, true);
    }

    private const FAKE_GRADCAM_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAEAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z';

    private function fakeAiResponse(array $overrides = []): array
    {
        return array_merge([
            'predicted_class' => 'Tomato__late_blight',
            'predicted_index' => 32,
            'confidence' => 0.9412,
            'low_confidence' => false,
            'top_k' => [
                ['class' => 'Tomato__late_blight', 'confidence' => 0.9412],
                ['class' => 'Tomato__early_blight', 'confidence' => 0.0388],
                ['class' => 'Potato__late_blight', 'confidence' => 0.0121],
            ],
            'inference_ms' => 187,
            'gradcam_base64' => self::FAKE_GRADCAM_BASE64,
            'gradcam_ms' => 210,
        ], $overrides);
    }

    public function test_guest_cannot_create_analysis(): void
    {
        $response = $this->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(401);
    }

    public function test_farmer_can_create_analysis_with_valid_image(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(), 200),
        ]);

        $response = $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('analysis.predicted_class', 'Tomato__late_blight');
        $response->assertJsonPath('analysis.status', 'done');

        $analysis = Analysis::first();
        $this->assertNotNull($analysis);
        $this->assertSame('done', $analysis->status);
        Storage::disk('public')->assertExists($analysis->image_path);
    }

    public function test_crop_is_derived_from_predicted_class(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(), 200),
        ]);

        $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $this->assertSame('Tomato', Analysis::first()->crop);
    }

    public function test_detected_crop_is_added_to_farmer_profile_after_analysis(): void
    {
        Storage::fake('public');
        Http::fake(['*/predict' => Http::response($this->fakeAiResponse(), 200)]);

        $farmer = $this->farmer();
        $farmer->update(['crops' => ['Wheat']]);

        $this->actingAs($farmer)->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ])->assertStatus(201);

        $farmer->refresh();
        $this->assertContains('Wheat', $farmer->crops);
        $this->assertContains('Tomato', $farmer->crops);
    }

    public function test_analysis_does_not_duplicate_an_existing_crop(): void
    {
        Storage::fake('public');
        Http::fake(['*/predict' => Http::response($this->fakeAiResponse(), 200)]);

        $farmer = $this->farmer();
        $farmer->update(['crops' => ['Tomato', 'Wheat']]);

        $this->actingAs($farmer)->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ])->assertStatus(201);

        $farmer->refresh();
        $this->assertSame(['Tomato', 'Wheat'], $farmer->crops);
    }

    public function test_invalid_file_type_is_rejected(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ]);

        $response->assertStatus(422);
    }

    public function test_oversized_file_is_rejected(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => UploadedFile::fake()->create('leaf.jpg', 9000, 'image/jpeg'),
        ]);

        $response->assertStatus(422);
    }

    public function test_ai_service_failure_returns_503_and_marks_analysis_failed(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response(['message' => 'internal error'], 500),
        ]);

        $response = $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(503);

        $analysis = Analysis::first();
        $this->assertNotNull($analysis);
        $this->assertSame('failed', $analysis->status);
    }

    public function test_index_only_returns_current_user_analyses(): void
    {
        Storage::fake('public');
        Http::fake(['*/predict' => Http::response($this->fakeAiResponse(), 200)]);

        $userA = $this->farmer();
        $userB = $this->farmer();

        $this->actingAs($userA)->postJson('/api/analyses', ['image' => $this->realLeafImage()])->assertStatus(201);
        $this->actingAs($userB)->postJson('/api/analyses', ['image' => $this->realLeafImage()])->assertStatus(201);

        $response = $this->actingAs($userA)->getJson('/api/analyses');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_show_forbids_access_to_another_users_analysis(): void
    {
        $owner = $this->farmer();
        $intruder = $this->farmer();

        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $response = $this->actingAs($intruder)->getJson("/api/analyses/{$analysis->id}");

        $response->assertStatus(403);
    }

    public function test_gradcam_heatmap_is_stored_and_exposed(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(), 200),
        ]);

        $response = $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(201);

        $analysis = Analysis::first();
        $this->assertNotNull($analysis->gradcam_path);
        Storage::disk('public')->assertExists($analysis->gradcam_path);

        $response->assertJsonPath(
            'analysis.gradcam_url',
            Storage::disk('public')->url($analysis->gradcam_path),
        );
    }

    public function test_missing_gradcam_from_ai_service_leaves_gradcam_url_null(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(['gradcam_base64' => null]), 200),
        ]);

        $response = $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('analysis.gradcam_url', null);
        $this->assertNull(Analysis::first()->gradcam_path);
    }

    public function test_low_confidence_flag_is_true_below_threshold(): void
    {
        Storage::fake('public');
        Http::fake([
            '*/predict' => Http::response($this->fakeAiResponse(['confidence' => 0.42]), 200),
        ]);

        $response = $this->actingAs($this->farmer())->postJson('/api/analyses', [
            'image' => $this->realLeafImage(),
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('analysis.low_confidence', true);
    }

    public function test_admin_and_expert_can_view_any_farmers_analysis(): void
    {
        $owner = $this->farmer();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $this->actingAs($this->admin())->getJson("/api/analyses/{$analysis->id}")->assertStatus(200);
        $this->actingAs($this->expert())->getJson("/api/analyses/{$analysis->id}")->assertStatus(200);
    }

    public function test_expert_can_validate_an_analysis(): void
    {
        $owner = $this->farmer();
        $expert = $this->expert();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'predicted_class' => 'Tomato__late_blight',
            'confidence' => 0.9,
            'status' => 'done',
        ]);

        $response = $this->actingAs($expert)->patchJson("/api/analyses/{$analysis->id}/validate", [
            'status' => 'validated',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('analysis.validation_status', 'validated');
        $this->assertSame($expert->id, $analysis->fresh()->expert_id);
        $this->assertNotNull($analysis->fresh()->expert_validated_at);
    }

    public function test_rejecting_an_analysis_requires_a_comment(): void
    {
        $owner = $this->farmer();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $this->actingAs($this->expert())
            ->patchJson("/api/analyses/{$analysis->id}/validate", ['status' => 'rejected'])
            ->assertStatus(422);

        $response = $this->actingAs($this->expert())->patchJson("/api/analyses/{$analysis->id}/validate", [
            'status' => 'rejected',
            'comment' => "Diagnostic peu fiable, à revérifier.",
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('analysis.validation_status', 'rejected');
        $response->assertJsonPath('analysis.expert_comment', "Diagnostic peu fiable, à revérifier.");
    }

    public function test_farmer_cannot_validate_an_analysis(): void
    {
        $owner = $this->farmer();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $this->actingAs($owner)
            ->patchJson("/api/analyses/{$analysis->id}/validate", ['status' => 'validated'])
            ->assertStatus(403);
    }

    public function test_farmer_and_expert_can_exchange_messages_on_an_analysis(): void
    {
        $owner = $this->farmer();
        $expert = $this->expert();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $this->actingAs($owner)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'Bonjour, un avis sur ce cas ?'])
            ->assertStatus(201);

        $this->actingAs($expert)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'Je regarde ça tout de suite.'])
            ->assertStatus(201);

        $response = $this->actingAs($owner)->getJson("/api/analyses/{$analysis->id}/messages");

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.user_role', 'farmer');
        $response->assertJsonPath('data.1.user_role', 'expert');
    }

    public function test_unrelated_farmer_cannot_read_or_post_messages(): void
    {
        $owner = $this->farmer();
        $intruder = $this->farmer();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $this->actingAs($intruder)->getJson("/api/analyses/{$analysis->id}/messages")->assertStatus(403);
        $this->actingAs($intruder)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'Je regarde ça.'])
            ->assertStatus(403);
    }

    public function test_message_owner_can_edit_their_message(): void
    {
        $owner = $this->farmer();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $messageId = $this->actingAs($owner)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'Premier message'])
            ->json('message.id');

        $response = $this->actingAs($owner)->patchJson(
            "/api/analyses/{$analysis->id}/messages/{$messageId}",
            ['message' => 'Message corrigé']
        );

        $response->assertStatus(200);
        $response->assertJsonPath('message.message', 'Message corrigé');
        $response->assertJsonPath('message.is_edited', true);
    }

    public function test_only_the_owner_can_edit_or_delete_a_message(): void
    {
        $owner = $this->farmer();
        $otherFarmer = $this->farmer();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $messageId = $this->actingAs($owner)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'Message du farmer'])
            ->json('message.id');

        $this->actingAs($otherFarmer)
            ->patchJson("/api/analyses/{$analysis->id}/messages/{$messageId}", ['message' => 'Hack'])
            ->assertStatus(403);

        $this->actingAs($otherFarmer)
            ->deleteJson("/api/analyses/{$analysis->id}/messages/{$messageId}")
            ->assertStatus(403);
    }

    public function test_deleting_a_message_hides_content_but_keeps_it_in_the_list(): void
    {
        $owner = $this->farmer();
        $expert = $this->expert();
        $analysis = Analysis::create([
            'user_id' => $owner->id,
            'image_path' => 'analyses/1/leaf.jpg',
            'status' => 'done',
        ]);

        $messageId = $this->actingAs($owner)
            ->postJson("/api/analyses/{$analysis->id}/messages", ['message' => 'À supprimer'])
            ->json('message.id');

        $deleteResponse = $this->actingAs($owner)->deleteJson(
            "/api/analyses/{$analysis->id}/messages/{$messageId}"
        );

        $deleteResponse->assertStatus(200);
        $deleteResponse->assertJsonPath('message.is_deleted', true);
        $deleteResponse->assertJsonPath('message.message', null);

        // Le message reste visible dans la liste (trace conservée), même pour l'expert.
        $listResponse = $this->actingAs($expert)->getJson("/api/analyses/{$analysis->id}/messages");
        $listResponse->assertStatus(200);
        $listResponse->assertJsonCount(1, 'data');
        $listResponse->assertJsonPath('data.0.is_deleted', true);
        $listResponse->assertJsonPath('data.0.message', null);
    }
}
