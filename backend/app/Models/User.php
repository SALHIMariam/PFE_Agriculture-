<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'farm',
        'governorate',
        'email',
        'password',
        'crops',
        'farm_profile',
        'irrigation_system',
        'main_season',
        'surface_ha',
        'language',
        'notification_preferences',
        'two_factor_enabled',
        'avatar_path',
        'is_active',
        'must_change_password',
    ];

    protected $appends = [
        'full_name',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'crops' => 'array',
            'notification_preferences' => 'array',
            'surface_ha' => 'decimal:2',
            'two_factor_enabled' => 'boolean',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /**
     * Climate zone derived from the user's governorate (config/tunisia.php):
     * nord (green) | centre (yellow) | sud (orange). Null when no / unknown
     * governorate.
     *
     * @return array{key: string, label: string, color: string}|null
     */
    public function climateZone(): ?array
    {
        $zone = config('tunisia.governorates.'.$this->governorate.'.zone');

        return match ($zone) {
            'nord' => ['key' => 'nord', 'label' => 'Nord', 'color' => 'green'],
            'centre' => ['key' => 'centre', 'label' => 'Centre', 'color' => 'yellow'],
            'sud' => ['key' => 'sud', 'label' => 'Sud', 'color' => 'orange'],
            default => null,
        };
    }

    public function loginHistories(): HasMany
    {
        return $this->hasMany(LoginHistory::class);
    }

    public function latestLogin(): HasOne
    {
        return $this->hasOne(LoginHistory::class)->latestOfMany('logged_in_at');
    }

    public function analyses(): HasMany
    {
        return $this->hasMany(Analysis::class);
    }

    /**
     * Notifications in-app custom (table `notifications`, non polymorphique).
     * Nommée différemment de `notifications()` pour ne pas entrer en conflit
     * avec la relation du même nom fournie par le trait Notifiable.
     */
    public function appNotifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }
}
