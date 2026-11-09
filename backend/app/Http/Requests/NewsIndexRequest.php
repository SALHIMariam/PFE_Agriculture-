<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class NewsIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'crop' => ['nullable', 'string', 'max:100'],
            'disease' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'in:new_disease,new_treatment,trend,alert,info'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
