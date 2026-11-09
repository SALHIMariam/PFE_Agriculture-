<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Analysis extends Model
{
    protected $fillable = [
        'user_id',
        'image_path',
        'gradcam_path',
        'predicted_class',
        'crop',
        'confidence',
        'top_k',
        'status',
        'inference_ms',
        'error_message',
        'expert_id',
        'expert_validated_at',
        'validation_status',
        'expert_comment',
        'cnn_validation_status',
        'cnn_expert_id',
        'cnn_validated_at',
        'cnn_expert_comment',
        'reco_validation_status',
        'reco_expert_id',
        'reco_validated_at',
        'reco_expert_comment',
        'temperature',
        'humidity',
        'rainfall',
        'wind_speed',
        'weather_fetched_at',
        'draft_response',
        'expert_edited_response',
        'expert_response',
        'priority_score',
        'priority_level',
        'safety_verdict',
        'confidence_score',
        'responded_at',
    ];

    protected $appends = [
        'disease',
    ];

    protected function casts(): array
    {
        return [
            'top_k' => 'array',
            'confidence' => 'float',
            'expert_validated_at' => 'datetime',
            'cnn_validated_at' => 'datetime',
            'reco_validated_at' => 'datetime',
            'temperature' => 'float',
            'humidity' => 'float',
            'rainfall' => 'float',
            'wind_speed' => 'float',
            'weather_fetched_at' => 'datetime',
            'expert_edited_response' => 'boolean',
            'responded_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function expert(): BelongsTo
    {
        return $this->belongsTo(User::class, 'expert_id');
    }

    public function cnnExpert(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cnn_expert_id');
    }

    public function recoExpert(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reco_expert_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AnalysisMessage::class)->orderBy('created_at');
    }

    public function getDiseaseAttribute(): ?string
    {
        if (! $this->predicted_class || ! str_contains($this->predicted_class, '__')) {
            return null;
        }

        return Str::after($this->predicted_class, '__');
    }
}
