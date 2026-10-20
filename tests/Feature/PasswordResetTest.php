<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const SAME_ANSWER = 'If an account uses that email, we sent a link to reset the password.';

    /** Ask for a link and return the token that was emailed. */
    private function requestToken(User $user): string
    {
        Notification::fake();

        $this->post('/forgot-password', ['email' => $user->email])->assertSessionHas('success');

        $token = null;

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        return (string) $token;
    }

    private function reset(User $user, string $token, array $overrides = [])
    {
        return $this->post('/reset-password', array_merge([
            'token' => $token,
            'email' => $user->email,
            'password' => 'BrandNew123',
            'password_confirmation' => 'BrandNew123',
        ], $overrides));
    }

    // ---------------------------------------------------------------
    // Step 1: ask for the link
    // ---------------------------------------------------------------

    public function test_the_forgot_password_page_renders_for_guests_only(): void
    {
        $this->get('/forgot-password')->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ForgotPassword')
                ->where('expiresInMinutes', 60));

        $this->actingAs(User::factory()->create())->get('/forgot-password')->assertRedirect('/dashboard');
    }

    public function test_the_login_page_links_to_it(): void
    {
        $this->get('/login')->assertOk();
        $this->assertSame('/forgot-password', route('password.request', [], false));
    }

    public function test_an_account_gets_a_reset_link_by_email(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertSessionHas('success', self::SAME_ANSWER);

        Notification::assertSentTo($user, ResetPassword::class);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_an_unknown_email_gets_exactly_the_same_answer_and_no_email(): void
    {
        Notification::fake();

        $this->post('/forgot-password', ['email' => 'nobody@gmail.com'])
            ->assertSessionHas('success', self::SAME_ANSWER)
            ->assertSessionHasNoErrors();

        Notification::assertNothingSent();
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_the_email_is_matched_without_regard_to_capital_letters(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'Mixed.Case@Gmail.com']);

        $this->post('/forgot-password', ['email' => '  mixed.case@GMAIL.com '])
            ->assertSessionHas('success', self::SAME_ANSWER);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_the_email_address_must_be_filled_in_and_valid(): void
    {
        Notification::fake();

        $this->post('/forgot-password', [])->assertSessionHasErrors('email');
        $this->post('/forgot-password', ['email' => 'not-an-email'])->assertSessionHasErrors('email');

        Notification::assertNothingSent();
    }

    public function test_an_account_cannot_be_mail_bombed_with_reset_links(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);
        $this->post('/forgot-password', ['email' => $user->email])
            ->assertSessionHas('success', self::SAME_ANSWER);

        // The second request is answered the same way but sends nothing.
        Notification::assertSentToTimes($user, ResetPassword::class, 1);
    }

    public function test_the_email_is_in_plain_words_and_links_to_the_reset_form(): void
    {
        $user = User::factory()->create(['name' => 'Maria Santos']);
        $token = $this->requestToken($user);

        $mail = (new ResetPassword($token))->toMail($user);

        $this->assertSame('Reset your ACC Marketplace password', $mail->subject);
        $this->assertStringContainsString("/reset-password/{$token}", $mail->actionUrl);
        $this->assertStringContainsString(urlencode($user->email), $mail->actionUrl);
        $this->assertStringContainsString('60 minutes', implode(' ', $mail->outroLines));
    }

    // ---------------------------------------------------------------
    // Step 3: choose a new password
    // ---------------------------------------------------------------

    public function test_the_link_opens_the_reset_form_with_the_token_and_email(): void
    {
        $user = User::factory()->create();
        $token = $this->requestToken($user);

        $this->get('/reset-password/'.$token.'?email='.urlencode($user->email))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ResetPassword')
                ->where('token', $token)
                ->where('email', $user->email));
    }

    public function test_a_valid_link_changes_the_password(): void
    {
        $user = User::factory()->create();
        $token = $this->requestToken($user);

        $this->reset($user, $token)
            ->assertRedirect('/login')
            ->assertSessionHas('success');

        $this->assertTrue(Hash::check('BrandNew123', $user->fresh()->password));
        $this->assertFalse(Hash::check('password', $user->fresh()->password));

        // The token is used up.
        $this->assertDatabaseCount('password_reset_tokens', 0);

        // Old password no longer works; the new one does.
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->post('/login', ['email' => $user->email, 'password' => 'BrandNew123'])->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);
    }

    public function test_the_remember_me_token_changes_so_old_devices_are_logged_out(): void
    {
        $user = User::factory()->create(['remember_token' => 'old-remember-token']);
        $token = $this->requestToken($user);

        $this->reset($user, $token);

        $this->assertNotSame('old-remember-token', $user->fresh()->remember_token);
    }

    public function test_a_link_works_only_once(): void
    {
        $user = User::factory()->create();
        $token = $this->requestToken($user);

        $this->reset($user, $token)->assertRedirect('/login');

        $this->reset($user, $token, ['password' => 'Another456x', 'password_confirmation' => 'Another456x'])
            ->assertSessionHasErrors('email');

        $this->assertTrue(Hash::check('BrandNew123', $user->fresh()->password));
    }

    public function test_a_link_expires(): void
    {
        $user = User::factory()->create();
        $token = $this->requestToken($user);

        $this->travel(61)->minutes();

        $this->reset($user, $token)->assertSessionHasErrors('email');
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_a_wrong_token_or_email_changes_nothing_and_reads_the_same(): void
    {
        $user = User::factory()->create();
        $this->requestToken($user);

        $this->reset($user, 'not-the-real-token')->assertSessionHasErrors('email');
        $wrongToken = (string) session('errors')->first('email');

        $this->reset(User::factory()->make(['email' => 'nobody@gmail.com']), 'not-the-real-token')
            ->assertSessionHasErrors('email');
        $unknownEmail = (string) session('errors')->first('email');

        // Cannot be used to find out which emails are registered.
        $this->assertSame($wrongToken, $unknownEmail);
        $this->assertStringContainsString('invalid or has expired', $wrongToken);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_the_new_password_must_meet_the_same_rules_as_sign_up(): void
    {
        $user = User::factory()->create();
        $token = $this->requestToken($user);

        foreach ([
            ['short1', 'short1'],            // too short
            ['onlyletters', 'onlyletters'],  // no number
            ['12345678', '12345678'],        // no letter
            ['BrandNew123', 'Different123'], // does not match
        ] as [$password, $confirmation]) {
            $this->reset($user, $token, ['password' => $password, 'password_confirmation' => $confirmation])
                ->assertSessionHasErrors('password');
        }

        // Nothing changed, and the link still works afterwards.
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
        $this->reset($user, $token)->assertRedirect('/login');
    }

    public function test_the_email_in_the_link_may_be_in_any_case(): void
    {
        $user = User::factory()->create(['email' => 'maria@gmail.com']);
        $token = $this->requestToken($user);

        $this->reset($user, $token, ['email' => 'MARIA@Gmail.com'])->assertRedirect('/login');

        $this->assertTrue(Hash::check('BrandNew123', $user->fresh()->password));
    }

    public function test_a_suspended_person_can_reset_the_password_but_still_cannot_log_in(): void
    {
        $user = User::factory()->create([
            'suspended_at' => now(),
            'suspension_type' => 'manual',
            'suspension_reason' => 'Selling stolen goods.',
        ]);
        $token = $this->requestToken($user);

        $this->reset($user, $token)->assertRedirect('/login');

        $this->post('/login', ['email' => $user->email, 'password' => 'BrandNew123'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_the_reset_pages_are_for_guests_only(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/reset-password/sometoken?email=x@gmail.com')->assertRedirect('/dashboard');
    }
}
