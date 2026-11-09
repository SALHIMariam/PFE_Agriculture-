<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name'   => ['required', 'string', 'max:50'],
            'last_name'    => ['required', 'string', 'max:50'],
            'farm'         => ['nullable', 'string', 'max:255'],
            'governorate'  => ['required', 'string', Rule::in(array_keys(config('tunisia.governorates')))],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'     => ['required', 'string', 'min:8', 'confirmed'],
            'crops'        => ['nullable', 'array'],
            'crops.*'      => ['string', 'max:100'],
            'farm_profile' => ['nullable', 'in:Small,Medium,Large'],
        ];
    }
}
