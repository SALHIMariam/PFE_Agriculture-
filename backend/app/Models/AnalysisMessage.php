<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalysisMessage extends Model
{
    protected $fillable = [
        'analysis_id',
        'user_id',
        'message',
        'is_deleted',
        'is_edited',
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
            'is_edited' => 'boolean',
            'deleted_at' => 'datetime',
        ];
    }

    public function analysis(): BelongsTo
    {
        return $this->belongsTo(Analysis::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Suppression logique : le contenu est effacé mais la ligne reste,
     * pour que la discussion garde une trace visible côté frontend.
     */
    public function softDeleteMessage(): void
    {
        $this->update([
            'is_deleted' => true,
            'deleted_at' => now(),
            'message' => '',
        ]);
    }
}
