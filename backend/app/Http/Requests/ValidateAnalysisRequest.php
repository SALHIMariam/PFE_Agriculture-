<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ValidateAnalysisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:validated,rejected'],
            'comment' => ['nullable', 'string', 'max:2000', 'required_if:status,rejected'],
        ];
    }
}
