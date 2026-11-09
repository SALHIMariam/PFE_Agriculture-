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
            // Un compte créé par l'admin est toujours un compte `expert` (voir
            // UserController::store()) : ni mot de passe ni rôle ne sont acceptés
            // depuis le client — le mot de passe est généré côté serveur et le
            // rôle est codé en dur.
            'name'         => ['required', 'string', 'max:255'],
            'farm'         => ['nullable', 'string', 'max:255'],
            'email'        => ['required', 'email', 'max:255', 'unique:users,email'],
            'crops'        => ['nullable', 'array'],
            'crops.*'      => ['string', 'max:100'],
            'farm_profile' => ['nullable', 'in:Small,Medium,Large'],
            'is_active'    => ['nullable', 'boolean'],
        ];
    }
}
