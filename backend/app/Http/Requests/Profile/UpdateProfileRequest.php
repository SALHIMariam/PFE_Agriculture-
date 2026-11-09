<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    /** Irrigation systems offered in the farm profile form. */
    public const IRRIGATION_SYSTEMS = [
        'goutte_a_goutte',
        'aspersion',
        'gravitaire',
        'pivot',
        'manuel',
        'aucun',
    ];

    /** Main growing seasons. */
    public const MAIN_SEASONS = [
        'printemps',
        'ete',
        'automne',
        'hiver',
        'toute_annee',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'              => ['sometimes', 'string', 'max:255'],
            'farm'              => ['nullable', 'string', 'max:255'],
            'email'             => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($this->user()->id)],
            'governorate'       => ['nullable', 'string', 'max:100'],
            'crops'             => ['nullable', 'array'],
            'crops.*'           => ['string', 'max:100'],
            'farm_profile'      => ['nullable', 'in:Small,Medium,Large'],
            'irrigation_system' => ['nullable', Rule::in(self::IRRIGATION_SYSTEMS)],
            'main_season'       => ['nullable', Rule::in(self::MAIN_SEASONS)],
            'surface_ha'        => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'two_factor_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
