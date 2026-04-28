<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cache des rôles et permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ──── Permissions ────
        $permissions = [
            // Utilisateurs
            'manage_users',
            'view_users',

            // Champs / Parcelles
            'view_fields',
            'create_fields',
            'edit_fields',
            'delete_fields',

            // Analyses
            'create_analysis',
            'view_analysis',

            // Alertes
            'validate_alert',
            'view_alerts',

            // Coopératives
            'manage_cooperatives',

            // Régions
            'manage_regions',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // ──── Rôles ────

        // Admin — accès total (dashboard + landing page)
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all());

        // Farmer — front-office uniquement
        $farmer = Role::firstOrCreate(['name' => 'farmer', 'guard_name' => 'web']);
        $farmer->syncPermissions([
            'view_fields',
            'create_fields',
            'edit_fields',
            'delete_fields',
            'create_analysis',
            'view_analysis',
            'view_alerts',
        ]);
    }
}
