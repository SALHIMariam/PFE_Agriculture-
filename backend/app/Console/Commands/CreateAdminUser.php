<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:create-admin';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Créer un administrateur de manière sécurisée';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🌱 Création d\'un compte administrateur');
        $this->newLine();

        // Demander les informations
        $name = $this->ask('Nom complet');
        $email = $this->ask('Email');
        $password = $this->secret('Mot de passe (min. 8 caractères)');
        $passwordConfirmation = $this->secret('Confirmer le mot de passe');

        // Validation
        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            $this->error('❌ Erreur de validation :');
            foreach ($validator->errors()->all() as $error) {
                $this->error("  - {$error}");
            }
            return self::FAILURE;
        }

        if ($password !== $passwordConfirmation) {
            $this->error('❌ Les mots de passe ne correspondent pas.');
            return self::FAILURE;
        }

        // Créer l'utilisateur
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'is_active' => true,
        ]);

        // Assigner le rôle admin
        $user->assignRole('admin');

        $this->newLine();
        $this->info('✅ Administrateur créé avec succès !');
        $this->table(
            ['ID', 'Nom', 'Email', 'Rôle'],
            [[$user->id, $user->name, $user->email, 'admin']]
        );

        return self::SUCCESS;
    }
}
