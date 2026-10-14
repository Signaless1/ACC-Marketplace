<?php

namespace App\Http\Requests;

use App\Support\PhilippinePhone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
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
            // 0917 123 4567, +63 917 123 4567 and 639171234567 all become
            // 09171234567. Anything that is not a PH mobile number is left
            // as typed so validation can reject it.
            'phone' => PhilippinePhone::normalize($this->phone) ?? $this->phone,
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
     * Shared by registration and the settings page. Expects the value to be
     * normalised first (see PhilippinePhone::normalize).
     *
     * @return array<int, mixed>
     */
    public static function phoneRules(?int $ignoreUserId = null): array
    {
        return [
            'string',
            // Exactly 11 digits starting with 09: the only form we store.
            'regex:'.PhilippinePhone::PATTERN,
            Rule::unique('users', 'phone')->ignore($ignoreUserId),
        ];
    }

    public static function phoneMessages(): array
    {
        return [
            'phone.required' => 'Enter your mobile number.',
            'phone.regex' => 'Enter a valid Philippine mobile number: 11 digits starting with 09 (like 09171234567), or +63 followed by 10 digits.',
            'phone.unique' => 'That mobile number is already linked to another account.',
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
            'phone' => ['required', ...self::phoneRules()],
            'password' => ['required', 'string', 'confirmed', self::passwordRule()],
        ];
    }

    public function messages(): array
    {
        return [
            ...self::phoneMessages(),
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
