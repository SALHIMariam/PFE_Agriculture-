<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NewsItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'summary' => $this->summary,
            'source_name' => $this->source_name,
            'url' => $this->url,
            'image_url' => $this->image_url,
            'category' => $this->category,
            'crop' => $this->crop,
            'disease_class' => $this->disease_class,
            'relevance_score' => $this->relevance_score,
            'ai_generated' => $this->ai_generated,
            'published_at' => $this->published_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
