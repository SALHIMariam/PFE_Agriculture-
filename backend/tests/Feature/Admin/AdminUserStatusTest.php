<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminUserStatusTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'expert', 'farmer'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function userWithRole(string $role, bool $active = true): User
    {
        $user = User::factory()->create(['is_active' => $active]);
        $user->assignRole($role);

        return $user;
    }

    public function test_admin_can_deactivate_a_farmer(): void
    {
        $admin  = $this->userWithRole('admin');
        $farmer = $this->userWithRole('farmer');

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$farmer->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('message', 'Compte désactivé avec succès.')
            ->assertJsonPath('user.is_active', false);

        $this->assertFalse($farmer->fresh()->is_active);
    }

    public function test_admin_can_activate_an_expert(): void
    {
        $admin  = $this->userWithRole('admin');
        $expert = $this->userWithRole('expert', active: false);

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$expert->id}/status", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('message', 'Compte activé avec succès.');

        $this->assertTrue($expert->fresh()->is_active);
    }

    public function test_explicit_status_is_idempotent(): void
    {
        $admin  = $this->userWithRole('admin');
        $farmer = $this->userWithRole('farmer', active: false);

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$farmer->id}/status", ['is_active' => false])
            ->assertOk();

        $this->assertFalse($farmer->fresh()->is_active);
    }

    public function test_non_admin_cannot_change_status(): void
    {
        $expert = $this->userWithRole('expert');
        $farmer = $this->userWithRole('farmer');

        $this->actingAs($expert)
            ->patchJson("/api/admin/users/{$farmer->id}/status", ['is_active' => false])
            ->assertForbidden();

        $this->assertTrue($farmer->fresh()->is_active);
    }

    public function test_admin_accounts_cannot_be_deactivated(): void
    {
        $admin = $this->userWithRole('admin');
        $other = $this->userWithRole('admin');

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$other->id}/status", ['is_active' => false])
            ->assertStatus(422);

        $this->assertTrue($other->fresh()->is_active);
    }

    public function test_invalid_payload_is_rejected(): void
    {
        $admin  = $this->userWithRole('admin');
        $farmer = $this->userWithRole('farmer');

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$farmer->id}/status", ['is_active' => 'peut-être'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('is_active');
    }
}
