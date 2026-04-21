<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'         => ['sometimes', 'string', 'max:255'],
            'farm'         => ['nullable', 'string', 'max:255'],
            'email'        => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($this->route('user'))],
            'password'     => ['nullable', 'string', 'min:8'],
            'crops'        => ['nullable', 'array'],
            'crops.*'      => ['string', 'max:100'],
            'farm_profile' => ['nullable', 'in:Small,Medium,Large'],
            'is_active'    => ['nullable', 'boolean'],
        ];
    }
}
