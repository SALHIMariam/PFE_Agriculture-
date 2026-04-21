<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['sometimes', 'string', 'max:255'],
            'farm'         => ['nullable', 'string', 'max:255'],
            'email'        => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($this->user()->id)],
            'crops'        => ['nullable', 'array'],
            'crops.*'      => ['string', 'max:100'],
            'farm_profile' => ['nullable', 'in:Small,Medium,Large'],
        ];
    }
}
