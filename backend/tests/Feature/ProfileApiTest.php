<?php

namespace Tests\Feature;

use App\Models\LoginHistory;
use App\Models\User;
use App\Support\NotificationPreferences;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
    }

    private function farmer(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge(['governorate' => 'Sfax'], $attributes));
        $user->assignRole('farmer');

        return $user;
    }

    public function test_profile_payload_exposes_new_farmer_fields_with_defaults(): void
    {
        $farmer = $this->farmer();
        LoginHistory::create([
            'user_id' => $farmer->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'logged_in_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($farmer)->getJson('/api/profile');

        $response->assertStatus(200);
        $response->assertJsonPath('user.language', 'fr');
        $response->assertJsonPath('user.two_factor_enabled', false);
        $response->assertJsonPath('user.climate_zone.key', 'centre'); // Sfax
        $response->assertJsonPath('user.climate_zone.color', 'yellow');
        $response->assertJsonPath('user.notification_preferences.disease_alerts', true);
        $response->assertJsonPath('user.notification_preferences.alert_weather_unfavorable', true);
        $this->assertNotNull($response->json('user.last_login_at'));
    }

    public function test_climate_zone_is_null_without_governorate(): void
    {
        $farmer = $this->farmer(['governorate' => null]);

        $this->actingAs($farmer)->getJson('/api/profile')
            ->assertStatus(200)
            ->assertJsonPath('user.climate_zone', null);
    }

    public function test_farmer_can_update_farm_profile_fields(): void
    {
        $farmer = $this->farmer();

        $response = $this->actingAs($farmer)->putJson('/api/profile', [
            'irrigation_system' => 'goutte_a_goutte',
            'main_season' => 'ete',
            'surface_ha' => 12.5,
            'governorate' => 'Nabeul',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('user.irrigation_system', 'goutte_a_goutte');
        $response->assertJsonPath('user.main_season', 'ete');
        $response->assertJsonPath('user.surface_ha', 12.5);
        $response->assertJsonPath('user.climate_zone.key', 'nord'); // Nabeul

        $this->assertDatabaseHas('users', [
            'id' => $farmer->id,
            'irrigation_system' => 'goutte_a_goutte',
            'surface_ha' => 12.5,
        ]);
    }

    public function test_invalid_irrigation_system_is_rejected(): void
    {
        $farmer = $this->farmer();

        $this->actingAs($farmer)->putJson('/api/profile', [
            'irrigation_system' => 'laser_beam',
        ])->assertStatus(422)->assertJsonValidationErrors('irrigation_system');
    }

    public function test_farmer_can_toggle_two_factor_flag(): void
    {
        $farmer = $this->farmer();

        $this->actingAs($farmer)->putJson('/api/profile', ['two_factor_enabled' => true])
            ->assertStatus(200)
            ->assertJsonPath('user.two_factor_enabled', true);

        $this->assertDatabaseHas('users', ['id' => $farmer->id, 'two_factor_enabled' => true]);
    }

    public function test_language_preference_is_persisted(): void
    {
        $farmer = $this->farmer();

        $this->actingAs($farmer)->putJson('/api/user/preferences', ['language' => 'ar'])
            ->assertStatus(200)
            ->assertJsonPath('user.language', 'ar');

        $this->assertDatabaseHas('users', ['id' => $farmer->id, 'language' => 'ar']);
    }

    public function test_unsupported_language_is_rejected(): void
    {
        $farmer = $this->farmer();

        $this->actingAs($farmer)->putJson('/api/user/preferences', ['language' => 'de'])
            ->assertStatus(422)->assertJsonValidationErrors('language');
    }

    public function test_notification_preferences_merge_with_defaults_and_persist(): void
    {
        $farmer = $this->farmer();

        $response = $this->actingAs($farmer)->putJson('/api/user/notification-preferences', [
            'notification_preferences' => [
                'agri_news' => false,
                'alert_weather_unfavorable' => false,
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('notification_preferences.agri_news', false);
        $response->assertJsonPath('notification_preferences.alert_weather_unfavorable', false);
        // untouched keys keep their default (true)
        $response->assertJsonPath('notification_preferences.disease_alerts', true);
        $response->assertJsonPath('notification_preferences.high_risk', true);

        $stored = $farmer->fresh()->notification_preferences;
        $this->assertFalse($stored['agri_news']);
        $this->assertTrue($stored['expert_validation']);
        $this->assertEqualsCanonicalizing(
            array_keys(NotificationPreferences::defaults()),
            array_keys($stored),
        );
    }

    public function test_notification_preferences_ignores_unknown_keys(): void
    {
        $farmer = $this->farmer();

        $this->actingAs($farmer)->putJson('/api/user/notification-preferences', [
            'notification_preferences' => ['hack_the_planet' => true, 'high_risk' => false],
        ])->assertStatus(200)->assertJsonMissingPath('notification_preferences.hack_the_planet');

        $this->assertArrayNotHasKey('hack_the_planet', $farmer->fresh()->notification_preferences);
    }

    public function test_guest_cannot_touch_profile_preferences(): void
    {
        $this->putJson('/api/user/preferences', ['language' => 'en'])->assertStatus(401);
        $this->putJson('/api/user/notification-preferences', ['notification_preferences' => []])->assertStatus(401);
    }

    private function realImage(string $name = 'avatar.jpg'): UploadedFile
    {
        // UploadedFile::fake()->image() needs the GD extension (absent here);
        // reuse a real JPEG from the dataset like NotificationTest does.
        $source = base_path('..'.DIRECTORY_SEPARATOR.'ai'.DIRECTORY_SEPARATOR.'dataset_final'
            .DIRECTORY_SEPARATOR.'test'.DIRECTORY_SEPARATOR.'Tomato__late_blight'
            .DIRECTORY_SEPARATOR.'Tomato__late_blight_0001.jpg');

        return new UploadedFile($source, $name, 'image/jpeg', null, true);
    }

    public function test_farmer_can_upload_and_replace_avatar(): void
    {
        Storage::fake('public');
        $farmer = $this->farmer();

        $first = $this->actingAs($farmer)->post('/api/profile/avatar', [
            'avatar' => $this->realImage('me.jpg'),
        ]);
        $first->assertStatus(200);
        $this->assertStringContainsString('/storage/avatars/', $first->json('avatar_url'));

        $oldPath = $farmer->fresh()->avatar_path;
        Storage::disk('public')->assertExists($oldPath);

        // profile payload now surfaces avatar_url
        $this->actingAs($farmer)->getJson('/api/profile')
            ->assertJsonPath('user.avatar_url', fn ($v) => is_string($v) && str_contains($v, '/storage/avatars/'));

        // replacing removes the previous file
        $this->actingAs($farmer)->post('/api/profile/avatar', [
            'avatar' => $this->realImage('me2.jpg'),
        ])->assertStatus(200);

        Storage::disk('public')->assertMissing($oldPath);
    }

    public function test_avatar_rejects_non_image(): void
    {
        Storage::fake('public');
        $farmer = $this->farmer();

        $this->actingAs($farmer)->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('avatar');
    }

    public function test_weather_current_returns_temperature_for_farmer_governorate(): void
    {
        Http::fake([
            'api.open-meteo.com/*' => Http::response([
                'current' => [
                    'temperature_2m' => 27.4,
                    'relative_humidity_2m' => 55,
                    'precipitation' => 0.0,
                    'wind_speed_10m' => 9.0,
                ],
            ], 200),
        ]);

        $farmer = $this->farmer(['governorate' => 'Sfax']);

        $this->actingAs($farmer)->getJson('/api/weather/current')
            ->assertStatus(200)
            ->assertJson([
                'available' => true,
                'governorate' => 'Sfax',
                'temperature' => 27,
                'condition' => 'clear',
            ]);
    }

    public function test_weather_current_available_false_without_governorate(): void
    {
        $farmer = $this->farmer(['governorate' => null]);

        $this->actingAs($farmer)->getJson('/api/weather/current')
            ->assertStatus(200)
            ->assertJson(['available' => false]);
    }
}
