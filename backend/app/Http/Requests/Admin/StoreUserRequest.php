<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'name'         => ['required', 'string', 'max:255'],
            'farm'         => ['nullable', 'string', 'max:255'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:8'],
            'crops'        => ['nullable', 'array'],
            'crops.*'      => ['string', 'max:100'],
            'farm_profile' => ['nullable', 'in:Small,Medium,Large'],
            'is_active'    => ['nullable', 'boolean'],
            'role'         => ['nullable', 'string', 'exists:roles,name'],
        ];
    }
}
