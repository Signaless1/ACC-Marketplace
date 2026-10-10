<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise input before validation: trim names, collapse repeated
     * spaces and store emails in lowercase.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->name)
                ? trim(preg_replace('/\s+/u', ' ', $this->name))
                : $this->name,
            'email' => is_string($this->email)
                ? mb_strtolower(trim($this->email))
                : $this->email,
        ]);
    }

    /**
     * Shared by registration and the settings page.
     *
     * @return array<int, mixed>
     */
    public static function nameRules(): array
    {
        return [
            'required',
            'string',
            'min:2',
            'max:60',
            // Letters (any language), spaces, apostrophes, periods and hyphens.
            "regex:/^[\p{L}\p{M}][\p{L}\p{M}\s.'\-]*$/u",
        ];
    }

    /**
     * Shared by registration and password changes.
     */
    public static function passwordRule(): Password
    {
        // 72 is bcrypt's hard limit; anything longer is silently truncated.
        return Password::min(8)->max(72)->letters()->numbers();
    }

    public function rules(): array
    {
        return [
            'name' => self::nameRules(),
            'email' => [
                'required',
                'string',
                'email:rfc',
                'max:254',
                'unique:users,email',
            ],
            'password' => ['required', 'string', 'confirmed', self::passwordRule()],
        ];
    }

    public function messages(): array
    {
        return [
            'name.regex' => 'Your name can only contain letters, spaces, apostrophes, periods and hyphens.',
            'name.min' => 'Please enter your full name.',
            'name.max' => 'Your name must be 60 characters or fewer.',
            'email.email' => 'Enter a valid email address, like you@example.com.',
            'email.max' => 'That email address is too long.',
            'email.unique' => 'An account with this email already exists. Try logging in instead.',
            'password.confirmed' => 'The two passwords do not match.',
        ];
    }
}
