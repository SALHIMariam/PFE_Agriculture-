<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Lève une exception dès qu'une relation Eloquent non eager-loadée
        // est accédée (N+1) — uniquement hors production, pour ne jamais
        // casser un cas limite non couvert par les tests en prod.
        Model::preventLazyLoading(! app()->isProduction());

        // Le lien de réinitialisation du mot de passe pointe vers le SPA
        // (pas vers une route web Laravel qui n'existe pas ici).
        ResetPassword::createUrlUsing(function ($notifiable, string $token): string {
            $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');

            return $frontend.'/reset-password?token='.$token
                .'&email='.urlencode($notifiable->getEmailForPasswordReset());
        });
    }
}
