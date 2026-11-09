<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Meeting extends Model
{
    protected $fillable = [
        'created_by', 'title', 'description', 'meet_link',
        'scheduled_at', 'duration_minutes', 'status', 'reminder_sent',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'reminder_sent' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function invitees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'meeting_user')
            ->withPivot('rsvp_status', 'notified_at')
            ->withTimestamps();
    }
}
