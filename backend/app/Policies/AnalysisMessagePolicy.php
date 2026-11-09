<?php

namespace App\Policies;

use App\Models\AnalysisMessage;
use App\Models\User;

class AnalysisMessagePolicy
{
    public function updateMessage(User $user, AnalysisMessage $message): bool
    {
        return $user->id === $message->user_id && ! $message->is_deleted;
    }

    public function deleteMessage(User $user, AnalysisMessage $message): bool
    {
        return $user->id === $message->user_id && ! $message->is_deleted;
    }
}
