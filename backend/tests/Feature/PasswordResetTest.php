<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_with_valid_email_sends_reset_link(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'grower@example.test']);

        $response = $this->postJson('/api/forgot-password', ['email' => 'grower@example.test']);

        $response->assertOk();
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_forgot_password_with_unknown_email_returns_422(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.test']);

        $response->assertStatus(422);
        Notification::assertNothingSent();
    }

    public function test_reset_password_with_valid_token_succeeds(): void
    {
        $user = User::factory()->create(['email' => 'reset-me@example.test']);
        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token'                 => $token,
            'email'                 => 'reset-me@example.test',
            'password'              => 'NewSecret123',
            'password_confirmation' => 'NewSecret123',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('NewSecret123', $user->fresh()->password));
    }

    public function test_reset_password_with_invalid_token_returns_422(): void
    {
        User::factory()->create(['email' => 'reset-me@example.test']);

        $response = $this->postJson('/api/reset-password', [
            'token'                 => 'totally-invalid-token',
            'email'                 => 'reset-me@example.test',
            'password'              => 'NewSecret123',
            'password_confirmation' => 'NewSecret123',
        ]);

        $response->assertStatus(422);
    }
}
