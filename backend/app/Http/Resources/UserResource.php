<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'farm'         => $this->farm,
            'email'        => $this->email,
            'crops'        => $this->crops,
            'farm_profile' => $this->farm_profile,
            'is_active'    => $this->is_active,
            'roles'        => $this->getRoleNames(),
            'created_at'   => $this->created_at?->toISOString(),
            'updated_at'   => $this->updated_at?->toISOString(),
        ];
    }
}
