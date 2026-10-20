<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Forgot password, in three steps:
 *
 *  1. The person enters their email.
 *  2. If an account uses it, we email a single-use link that expires after
 *     config('auth.passwords.users.expire') minutes (60 by default).
 *  3. The link opens a form where they choose a new password. Every device
 *     is logged out, and they log in again with the new one.
 *
 * Step 1 answers the same way whether or not the email has an account, so the
 * form cannot be used to find out who is registered.
 */
class PasswordResetController extends Controller
{
    /** Step 1: the "forgot password" form. */
    public function request(): Response
    {
        return Inertia::render('ForgotPassword', [
            'expiresInMinutes' => $this->expiryMinutes(),
        ]);
    }

    /** Step 2: email the link. */
    public function email(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
        ], [
            'email.required' => 'Enter the email address of your account.',
            'email.email' => 'Enter a valid email address, like you@example.com.',
        ]);

        $user = $this->findByEmail($validated['email']);

        if ($user !== null) {
            // The broker also limits each account to one link per minute. Its
            // answer is deliberately not shown: the message below is the same
            // whatever happens.
            Password::sendResetLink(['email' => $user->email]);
        }

        return back()->with(
            'success',
            'If an account uses that email, we sent a link to reset the password.'
        );
    }

    /** Step 3a: the form behind the link in the email. */
    public function form(Request $request, string $token): Response
    {
        return Inertia::render('ResetPassword', [
            'token' => $token,
            'email' => (string) $request->query('email', ''),
        ]);
    }

    /** Step 3b: save the new password. */
    public function update(Request $request): RedirectResponse
    {
        $request->merge([
            'email' => is_string($request->input('email'))
                ? mb_strtolower(trim($request->input('email')))
                : $request->input('email'),
        ]);

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email:rfc', 'max:254'],
            'password' => ['required', 'string', 'confirmed', RegisterRequest::passwordRule()],
        ], [
            'password.confirmed' => 'The two passwords do not match.',
        ]);

        $account = $this->findByEmail($validated['email']);

        $status = Password::reset(
            [
                'email' => $account?->email ?? $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => $request->input('password_confirmation'),
                'token' => $validated['token'],
            ],
            function (User $user, string $password) {
                // The model hashes the password (see its casts).
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                // Whoever else was logged in, perhaps the person the password
                // was reset to lock out, is logged out everywhere.
                if (config('session.driver') === 'database') {
                    DB::table(config('session.table', 'sessions'))
                        ->where('user_id', $user->id)
                        ->delete();
                }

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return redirect()
                ->route('login')
                ->with('success', 'Your password was changed. Log in with your new password.');
        }

        // A bad link, an expired one and an unknown email all read the same.
        throw ValidationException::withMessages([
            'email' => 'This reset link is invalid or has expired. Please request a new one.',
        ]);
    }

    private function findByEmail(string $email): ?User
    {
        return User::query()
            ->whereRaw('lower(email) = ?', [mb_strtolower(trim($email))])
            ->first();
    }

    private function expiryMinutes(): int
    {
        return (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);
    }
}
