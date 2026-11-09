<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminUserSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'expert', 'farmer'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['name' => 'Root Admin', 'email' => 'root@agrinova.test']);
        $admin->assignRole('admin');

        return $admin;
    }

    private function makeUser(string $name, string $email, string $role, array $extra = []): User
    {
        $user = User::factory()->create(array_merge([
            'name'  => $name,
            'email' => $email,
        ], $extra));
        $user->assignRole($role);

        return $user;
    }

    public function test_search_by_partial_name_returns_matching_users(): void
    {
        $admin = $this->admin();
        $this->makeUser('Mariam Salhi', 'mariam@example.test', 'farmer');
        $this->makeUser('Marwan Trabelsi', 'marwan@example.test', 'farmer');
        $this->makeUser('Youssef Ben Ali', 'youssef@example.test', 'farmer');

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=mar');

        $response->assertOk();
        $names = collect($response->json('users'))->pluck('name')->all();

        $this->assertContains('Mariam Salhi', $names);
        $this->assertContains('Marwan Trabelsi', $names);
        $this->assertNotContains('Youssef Ben Ali', $names);
    }

    public function test_search_by_email_returns_correct_user(): void
    {
        $admin = $this->admin();
        $this->makeUser('Mariam Salhi', 'mariam.salhi@agrinova.test', 'farmer');
        $this->makeUser('Other Person', 'other@elsewhere.test', 'farmer');

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=mariam.salhi@agrinova');

        $response->assertOk();
        $users = $response->json('users');

        $this->assertCount(1, $users);
        $this->assertSame('mariam.salhi@agrinova.test', $users[0]['email']);
    }

    public function test_role_filter_returns_only_farmers(): void
    {
        $admin = $this->admin();
        $this->makeUser('Farmer One', 'f1@example.test', 'farmer');
        $this->makeUser('Farmer Two', 'f2@example.test', 'farmer');
        $this->makeUser('Expert One', 'e1@example.test', 'expert');

        $response = $this->actingAs($admin)->getJson('/api/admin/users?role=farmer');

        $response->assertOk();
        $roles = collect($response->json('users'))->pluck('roles')->flatten()->unique()->all();

        $this->assertSame(['farmer'], array_values($roles));
        $this->assertCount(2, $response->json('users'));
    }

    public function test_governorate_filter_restricts_results(): void
    {
        $admin = $this->admin();
        $this->makeUser('Sfax Grower', 'sfax@example.test', 'farmer', ['governorate' => 'Sfax']);
        $this->makeUser('Gabes Grower', 'gabes@example.test', 'farmer', ['governorate' => 'Gabès']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?governorate=Sfax');

        $response->assertOk();
        $users = $response->json('users');

        $this->assertCount(1, $users);
        $this->assertSame('Sfax Grower', $users[0]['name']);
    }

    public function test_empty_search_returns_all_users_paginated(): void
    {
        $admin = $this->admin();
        foreach (range(1, 12) as $i) {
            $this->makeUser("User {$i}", "user{$i}@example.test", 'farmer');
        }

        $response = $this->actingAs($admin)->getJson('/api/admin/users?per_page=10');

        $response->assertOk();
        $response->assertJsonPath('meta.per_page', 10);
        $response->assertJsonPath('meta.total', 13); // 12 farmers + 1 admin
        $response->assertJsonPath('meta.last_page', 2);
        $this->assertCount(10, $response->json('users'));
    }
}
