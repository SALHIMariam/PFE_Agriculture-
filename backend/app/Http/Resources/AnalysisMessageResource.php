<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnalysisMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'analysis_id' => $this->analysis_id,
            'user_id' => $this->user_id,
            'user_name' => $this->user->full_name ?: $this->user->name,
            'user_role' => $this->user->getRoleNames()->first(),
            'message' => $this->is_deleted ? null : $this->message,
            'is_deleted' => $this->is_deleted,
            'is_edited' => $this->is_edited,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
