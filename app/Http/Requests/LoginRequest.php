<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
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
            'remember' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Enter your email address.',
            'email.email' => 'Enter a valid email address, like you@example.com.',
            'password.required' => 'Enter your password.',
        ];
    }

    /**
     * Attempt to authenticate, with per-email-and-IP rate limiting.
     *
     * Emails are matched case-insensitively so accounts created before
     * emails were normalised can still log in.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $user = User::query()
            ->whereRaw('lower(email) = ?', [$this->string('email')->toString()])
            ->first();

        $password = $this->string('password')->toString();

        // Always run one bcrypt operation so response time does not reveal
        // whether the email exists.
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

        if ($user->isSuspended()) {
            // The password was right, so it is safe to say why and where the
            // appeal stands, instead of leaving them at a dead end.
            throw ValidationException::withMessages([
                'email' => $this->suspendedMessage($user),
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        Auth::login($user, $this->boolean('remember'));
    }

    private function suspendedMessage(User $user): string
    {
        $message = 'This account has been suspended'
            .($user->suspension_reason ? ': '.rtrim($user->suspension_reason, '.').'.' : '.');

        $appeal = $user->appeals()->latest('id')->first();

        if ($appeal === null) {
            return $message.' You can appeal this decision.';
        }

        if ($appeal->status === 'pending') {
            return $message.' Your appeal is waiting for review.';
        }

        if ($appeal->status === 'denied') {
            return $message.' Your last appeal was refused'
                .($appeal->decision_note ? ': '.rtrim($appeal->decision_note, '.').'.' : '.')
                .' You can appeal again later.';
        }

        return $message;
    }

    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => "Too many login attempts. Try again in {$seconds} seconds.",
        ]);
    }

    private function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower($this->string('email')->toString()).'|'.$this->ip()
        );
    }
}
