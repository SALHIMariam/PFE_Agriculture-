<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsItem extends Model
{
    protected $fillable = [
        'title',
        'summary',
        'source_name',
        'url',
        'url_hash',
        'image_url',
        'category',
        'crop',
        'disease_class',
        'relevance_score',
        'ai_generated',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'relevance_score' => 'float',
            'ai_generated' => 'boolean',
            'published_at' => 'datetime',
        ];
    }
}
