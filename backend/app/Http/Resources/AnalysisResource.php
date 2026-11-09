<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AnalysisResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_url' => Storage::disk('public')->url($this->image_path),
            'gradcam_url' => $this->gradcam_path ? Storage::disk('public')->url($this->gradcam_path) : null,
            'predicted_class' => $this->predicted_class,
            'crop' => $this->crop,
            'confidence' => $this->confidence,
            'top_k' => $this->top_k,
            'status' => $this->status,
            'low_confidence' => $this->confidence !== null && $this->confidence < 0.60,
            'validation_status' => $this->validation_status,
            'expert_comment' => $this->expert_comment,
            'expert_validated_at' => $this->expert_validated_at?->toISOString(),
            'expert_name' => $this->expert?->full_name,
            'cnn_validation_status' => $this->cnn_validation_status,
            'cnn_expert_comment' => $this->cnn_expert_comment,
            'cnn_validated_at' => $this->cnn_validated_at?->toISOString(),
            'cnn_expert_name' => $this->cnnExpert?->full_name,
            'reco_validation_status' => $this->reco_validation_status,
            'reco_expert_comment' => $this->reco_expert_comment,
            'reco_validated_at' => $this->reco_validated_at?->toISOString(),
            'reco_expert_name' => $this->recoExpert?->full_name,
            'farmer_name' => $this->user?->full_name,
            'farmer_governorate' => $this->user?->governorate,
            'messages_count' => $this->whenCounted('messages'),
            'created_at' => $this->created_at?->toISOString(),
            // Assistant AI
            'draft_response' => $this->draft_response,
            'expert_edited_response' => $this->expert_edited_response,
            'expert_response' => $this->expert_response,
            'priority_score' => $this->priority_score,
            'priority_level' => $this->priority_level,
            'safety_verdict' => $this->safety_verdict,
            'confidence_score' => $this->confidence_score,
            'responded_at' => $this->responded_at?->toISOString(),
        ];
    }
}
