<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The password reset email, in plain words.
        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $minutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            return (new MailMessage)
                ->subject('Reset your ACC Marketplace password')
                ->greeting('Hello'.(isset($notifiable->name) ? ' '.$notifiable->name : '').',')
                ->line('We received a request to reset the password for your ACC Marketplace account.')
                ->action('Choose a new password', $url)
                ->line("This link works once and expires in {$minutes} minutes.")
                ->line('If you did not ask for this, ignore this email. Your password will stay the same.');
        });
    }
}
