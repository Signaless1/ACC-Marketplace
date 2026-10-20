<?php

namespace App\Http\Requests;

use App\Rules\PhilippineMobile;
use App\Rules\RealEmail;
use App\Support\PhoneNumber;
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
            // 0917 123 4567, +63 917 123 4567 and 9171234567 all become
            // +639171234567. Anything that is not a mobile number is left as
            // typed so the error message can show what was entered.
            'phone' => is_string($this->phone)
                ? (PhoneNumber::normalize($this->phone) ?? trim($this->phone))
                : $this->phone,
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
     * Shared by registration and the settings page. The value must already be
     * normalised with PhoneNumber::normalize(); the rule only accepts the
     * canonical +639XXXXXXXXX form, so uniqueness is checked on one spelling.
     *
     * @return array<int, mixed>
     */
    public static function phoneRules(?int $ignoreUserId = null): array
    {
        return [
            'bail',
            'required',
            'string',
            'max:20',
            new PhilippineMobile(),
            Rule::unique('users', 'phone')->ignore($ignoreUserId),
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
                'bail',
                'required',
                'string',
                'email:rfc',
                'max:254',
                // Not a throw-away mailbox, a typo like emaill.com, or a domain
                // that does not exist.
                new RealEmail(),
                'unique:users,email',
            ],
            'phone' => self::phoneRules(),
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
            'phone.required' => 'Enter your mobile number, like 0917 123 4567.',
            'phone.unique' => 'This mobile number is already registered to another account.',
            'password.confirmed' => 'The two passwords do not match.',
        ];
    }
}
