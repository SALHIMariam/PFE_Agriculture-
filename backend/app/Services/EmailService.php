<?php

namespace App\Services;

use App\Mail\ExpertAccountCreated;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class EmailService
{
    public function sendCredentials(User $user, string $tempPassword): bool
    {
        try {
            Mail::to($user->email)->send(new ExpertAccountCreated($user, $tempPassword));

            return true;
        } catch (Throwable $e) {
            Log::error('Échec de l\'envoi de l\'e-mail de création de compte Expert.', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return false;
        }
    }
}
