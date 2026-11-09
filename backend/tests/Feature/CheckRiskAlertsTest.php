<?php

namespace Tests\Feature;

use App\Mail\RiskAlertMail;
use App\Models\Analysis;
use App\Models\Notification;
use App\Models\RiskAlertState;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CheckRiskAlertsTest extends TestCase
{
    use RefreshDatabase;

    private const DISEASE = 'Tomato__early_blight';
    private const GOVERNORATE = 'Sfax';

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
    }

    private function farmerWithRecentDisease(int $daysAgo = 1): User
    {
        $farmer = User::factory()->create(['governorate' => self::GOVERNORATE, 'is_active' => true]);
        $farmer->assignRole('farmer');

        $analysis = Analysis::create([
            'user_id' => $farmer->id,
            'image_path' => 'x.jpg',
            'status' => 'done',
            'predicted_class' => self::DISEASE,
            'crop' => 'Tomato',
            'confidence' => 0.8,
        ]);
        $analysis->forceFill(['created_at' => now()->subDays($daysAgo)])->save();

        return $farmer;
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
                'risk_level' => 'x',
                'top_factors' => [],
                'confidence' => 0.9,
            ], 200),
        ]);
    }

    public function test_below_40_percent_sends_no_notification(): void
    {
        Mail::fake();
        $farmer = $this->farmerWithRecentDisease();
        $this->fakeWeatherAndRisk(28);

        $this->artisan('risk:check-alerts')->assertExitCode(0);

        $this->assertSame(0, Notification::where('user_id', $farmer->id)->count());
        Mail::assertNothingSent();
    }

    public function test_40_to_69_percent_sends_informative_notification_without_mail(): void
    {
        Mail::fake();
        $farmer = $this->farmerWithRecentDisease();
        $this->fakeWeatherAndRisk(61);

        $this->artisan('risk:check-alerts')->assertExitCode(0);

        $notification = Notification::where('user_id', $farmer->id)->where('type', 'risk_alert')->first();
        $this->assertNotNull($notification);
        $this->assertSame('informative', $notification->data['level']);
        $this->assertSame(61, $notification->data['risk_score']);
        Mail::assertNothingSent();
    }

    public function test_70_percent_or_more_sends_urgent_notification_with_mail(): void
    {
        Mail::fake();
        $farmer = $this->farmerWithRecentDisease();
        $this->fakeWeatherAndRisk(84);

        $this->artisan('risk:check-alerts')->assertExitCode(0);

        $notification = Notification::where('user_id', $farmer->id)->where('type', 'risk_alert')->first();
        $this->assertNotNull($notification);
        $this->assertSame('urgent', $notification->data['level']);
        $this->assertSame(84, $notification->data['risk_score']);

        Mail::assertSent(RiskAlertMail::class, fn ($mail) => $mail->hasTo($farmer->email) && $mail->riskScore === 84);
    }

    public function test_dedupe_does_not_resend_at_the_same_level_before_72h(): void
    {
        Mail::fake();
        $farmer = $this->farmerWithRecentDisease();
        $this->fakeWeatherAndRisk(61);

        $this->artisan('risk:check-alerts');
        $this->assertSame(1, Notification::where('user_id', $farmer->id)->count());

        // Same level (61% is still 'informative'), only 1h later.
        RiskAlertState::where('user_id', $farmer->id)->update(['last_notified_at' => now()->subHour()]);
        $this->artisan('risk:check-alerts');

        $this->assertSame(1, Notification::where('user_id', $farmer->id)->count());
    }

    public function test_dedupe_resends_after_72h_at_the_same_level(): void
    {
        Mail::fake();
        $farmer = $this->farmerWithRecentDisease();
        $this->fakeWeatherAndRisk(61);

        $this->artisan('risk:check-alerts');
        $this->assertSame(1, Notification::where('user_id', $farmer->id)->count());

        RiskAlertState::where('user_id', $farmer->id)->update(['last_notified_at' => now()->subHours(73)]);
        $this->artisan('risk:check-alerts');

        $this->assertSame(2, Notification::where('user_id', $farmer->id)->count());
    }

    public function test_dedupe_resends_immediately_on_level_escalation(): void
    {
        Mail::fake();
        $farmer = $this->farmerWithRecentDisease();

        // A single Http::fake() with a mutable score: calling Http::fake()
        // a second time mid-test does NOT replace the first registration —
        // Laravel appends stub callbacks, and the first one matching a URL
        // wins, so a later fakeWeatherAndRisk(88) would silently never be
        // reached. Reading $score by reference sidesteps that.
        $score = 55;
        $time = array_map(fn ($i) => now()->addDays($i)->format('Y-m-d'), range(0, 7));
        Http::fake([
            'api.open-meteo.com/*' => Http::response(['daily' => [
                'time' => $time,
                'temperature_2m_mean' => array_fill(0, 8, 28.0),
                'relative_humidity_2m_mean' => array_fill(0, 8, 60.0),
                'precipitation_sum' => array_fill(0, 8, 1.0),
                'wind_speed_10m_max' => array_fill(0, 8, 10.0),
            ]], 200),
            // A regular closure with an explicit `use (&$score)` — an arrow
            // function (`fn() => ...`) would capture $score by value at
            // definition time, so mutating it below wouldn't be seen here.
            '*/spread-risk' => function () use (&$score) {
                return Http::response([
                    'risk_score' => $score,
                    'risk_level' => 'x',
                    'top_factors' => [],
                    'confidence' => 0.9,
                ], 200);
            },
        ]);

        $this->artisan('risk:check-alerts');
        $this->assertSame(1, Notification::where('user_id', $farmer->id)->count());
        Mail::assertNothingSent();

        // Risk escalates to urgent on a later run — must notify immediately,
        // no 72h wait, and this time with mail. Flush the 6h forecast cache
        // first: within the same window the service would otherwise keep
        // serving the first computation's score, same as in production
        // until that window expires.
        \Illuminate\Support\Facades\Cache::flush();
        $score = 88;
        $this->artisan('risk:check-alerts');

        $this->assertSame(2, Notification::where('user_id', $farmer->id)->count());
        Mail::assertSent(RiskAlertMail::class, 1);
    }

    public function test_inactive_farmers_are_skipped(): void
    {
        Mail::fake();
        $farmer = $this->farmerWithRecentDisease();
        $farmer->update(['is_active' => false]);
        $this->fakeWeatherAndRisk(90);

        $this->artisan('risk:check-alerts');

        $this->assertSame(0, Notification::where('user_id', $farmer->id)->count());
    }

    public function test_farmers_without_recent_disease_analysis_are_skipped(): void
    {
        Mail::fake();
        // Analysis older than 30 days — must not be picked up.
        $farmer = $this->farmerWithRecentDisease(daysAgo: 45);
        $this->fakeWeatherAndRisk(90);

        $this->artisan('risk:check-alerts');

        $this->assertSame(0, Notification::where('user_id', $farmer->id)->count());
    }
}
