<?php

namespace App\Policies;

use App\Models\Analysis;
use App\Models\User;

class AnalysisPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Analysis $analysis): bool
    {
        return $user->id === $analysis->user_id || $user->hasAnyRole(['expert', 'admin']);
    }

    public function validate(User $user, Analysis $analysis): bool
    {
        return $user->hasAnyRole(['expert', 'admin']);
    }

    /** Seul le farmer propriétaire peut supprimer son analyse. */
    public function delete(User $user, Analysis $analysis): bool
    {
        return $user->id === $analysis->user_id;
    }
}
