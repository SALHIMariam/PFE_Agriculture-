<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Créer rôles et permissions
        $this->call(RolesAndPermissionsSeeder::class);

        // Jeux de données de démo/test — volontairement non appelés ici pour
        // ne jamais peupler un environnement (dev ou prod) sans le demander
        // explicitement. Lancer manuellement au besoin :
        //   php artisan db:seed --class=DemoAnalysesSeeder
        //   php artisan db:seed --class=NewsDemoSeeder
        //   php artisan db:seed --class=TestDataSeeder
    }
}
