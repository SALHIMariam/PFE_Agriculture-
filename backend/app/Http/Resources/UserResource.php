<?php

namespace App\Http\Resources;

use App\Support\NotificationPreferences;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'first_name'   => $this->first_name,
            'last_name'    => $this->last_name,
            'full_name'    => $this->full_name,
            'farm'         => $this->farm,
            'governorate'  => $this->governorate,
            'email'        => $this->email,
            'crops'        => $this->crops,
            'farm_profile' => $this->farm_profile,
            'irrigation_system' => $this->irrigation_system,
            'main_season'  => $this->main_season,
            'surface_ha'   => $this->surface_ha !== null ? (float) $this->surface_ha : null,
            'language'     => $this->language ?? 'fr',
            'notification_preferences' => NotificationPreferences::merge($this->notification_preferences, []),
            'two_factor_enabled' => (bool) $this->two_factor_enabled,
            'avatar_url'   => $this->avatar_path ? Storage::url($this->avatar_path) : null,
            'climate_zone' => $this->climateZone(),
            'is_active'    => $this->is_active,
            'must_change_password' => $this->must_change_password,
            'roles'        => $this->getRoleNames(),
            'last_login_at' => $this->whenLoaded(
                'latestLogin',
                fn () => $this->latestLogin?->logged_in_at?->toISOString(),
            ),
            'created_at'   => $this->created_at?->toISOString(),
            'updated_at'   => $this->updated_at?->toISOString(),
        ];
    }
}
