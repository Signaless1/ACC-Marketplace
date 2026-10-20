<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * A suspended person cannot log in, so an appeal has to be filed from outside
 * the app. To stop strangers from filing appeals in someone else's name (and
 * from using this form to guess passwords) it asks for the account's own
 * email and password, and shares the login form's rate limiter: five wrong
 * guesses lock both forms for the same email and IP.
 */
class AppealRequest extends FormRequest
{
    private const MAX_ATTEMPTS = 5;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->email)
                ? mb_strtolower(trim($this->email))
                : $this->email,
        ]);
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
            'message' => ['required', 'string', 'min:20', 'max:1500'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Enter the email address of your account.',
            'email.email' => 'Enter a valid email address, like you@example.com.',
            'password.required' => 'Enter your password so we know the appeal is really yours.',
            'message.required' => 'Explain why the suspension should be lifted.',
            'message.min' => 'Please give a little more detail (at least 20 characters).',
            'message.max' => 'Your appeal must be 1500 characters or fewer.',
        ];
    }

    /**
     * Confirm the email and password belong together and return the account.
     *
     * @throws ValidationException
     */
    public function authenticate(): User
    {
        $this->ensureIsNotRateLimited();

        $user = User::query()
            ->whereRaw('lower(email) = ?', [$this->string('email')->toString()])
            ->first();

        $password = $this->string('password')->toString();

        // One bcrypt run either way, so timing does not reveal whether the
        // email exists.
        if ($user) {
            $passwordOk = Hash::check($password, $user->password);
        } else {
            Hash::make($password);
            $passwordOk = false;
        }

        if (! $user || ! $passwordOk) {
            RateLimiter::hit($this->throttleKey(), 60);

            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        return $user;
    }

    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => "Too many attempts. Try again in {$seconds} seconds.",
        ]);
    }

    /** Same key as LoginRequest, so both forms count against one limit. */
    private function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower($this->string('email')->toString()).'|'.$this->ip()
        );
    }
}
