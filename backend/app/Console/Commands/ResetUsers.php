<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class ResetUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:reset-users {--email=} {--password=} {--name=Super Admin} {--role=super-admin} {--yes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Supprime tous les comptes et crée un super-admin via la ligne de commande (sans hardcoding)';

    public function handle(): int
    {
        $this->info('⚠️  Réinitialisation des comptes utilisateurs');

        if (!$this->option('yes')) {
            if (!$this->confirm('Confirmez-vous la suppression de TOUS les comptes en base ?')) {
                $this->info('Annulé. Aucun changement effectué.');
                return self::SUCCESS;
            }
        }

        // Supprimer tous les utilisateurs (tout en gérant les contraintes étrangères)
        Schema::disableForeignKeyConstraints();
        User::truncate();
        Schema::enableForeignKeyConstraints();

        $this->info('✔️  Tous les comptes ont été supprimés.');

        // Récupérer les informations pour le super-admin
        $email = $this->option('email') ?? $this->ask('Email du super-admin');
        $password = $this->option('password') ?? $this->secret('Mot de passe du super-admin (min 8 caractères)');
        $name = $this->option('name');
        $roleName = $this->option('role');

        // Validation
        $validator = Validator::make([
            'email' => $email,
            'password' => $password,
        ], [
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            $this->error('❌ Erreur de validation :');
            foreach ($validator->errors()->all() as $error) {
                $this->error("  - {$error}");
            }
            return self::FAILURE;
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $role = Role::firstOrCreate(['name' => $roleName]);
        $user->assignRole($role);

        $this->info('✅ Super-admin créé avec succès :');
        $this->table(['ID', 'Nom', 'Email', 'Rôle'], [[$user->id, $user->name, $user->email, $roleName]]);

        return self::SUCCESS;
    }
}
