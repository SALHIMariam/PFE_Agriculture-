<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiskAlertState extends Model
{
    protected $fillable = [
        'user_id',
        'disease',
        'governorate',
        'last_notified_level',
        'last_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'last_notified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
