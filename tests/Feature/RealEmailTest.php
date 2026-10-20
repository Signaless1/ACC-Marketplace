<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\EmailCheck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealEmailTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@gmail.com',
            'phone' => '09171234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $overrides);
    }

    private function emailError(string $email): string
    {
        $this->post('/register', $this->registration(['email' => $email]))
            ->assertSessionHasErrors('email');

        return (string) session('errors')->first('email');
    }

    // ---------------------------------------------------------------
    // Misspelled and throw-away addresses (always refused)
    // ---------------------------------------------------------------

    public function test_a_misspelled_popular_domain_is_refused_with_a_suggestion(): void
    {
        // The address from the bug report.
        $message = $this->emailError('test@emaill.com');

        $this->assertStringContainsString('Did you mean test@email.com', $message);

        foreach (['maria@gmial.com' => 'gmail.com', 'maria@gmail.con' => 'gmail.com', 'maria@yahooo.com' => 'yahoo.com'] as $typed => $real) {
            $this->assertStringContainsString($real, $this->emailError($typed), $typed);
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_disposable_mailbox_services_are_refused(): void
    {
        foreach (['kid@mailinator.com', 'kid@yopmail.com', 'kid@sub.mailinator.com', 'kid@guerrillamail.com'] as $email) {
            $this->assertStringContainsString('disposable', $this->emailError($email), $email);
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_real_providers_and_lookalikes_are_not_flagged(): void
    {
        foreach ([
            'a@gmail.com', 'a@yahoo.com', 'a@yahoo.com.ph', 'a@outlook.com', 'a@hotmail.com', 'a@icloud.com',
            'a@email.com', 'a@mail.com', 'a@ymail.com', 'a@live.com', 'a@gmx.com',
            'a@acc.edu.ph', 'a@student.acc.edu.ph', 'a@up.edu.ph', 'a@notmailinator.com',
        ] as $email) {
            $this->assertNull(EmailCheck::suggestion((string) EmailCheck::domainOf($email)), $email);
            $this->assertFalse(EmailCheck::isDisposable((string) EmailCheck::domainOf($email)), $email);
        }
    }

    public function test_a_correctly_spelled_address_still_registers(): void
    {
        $this->post('/register', $this->registration(['email' => 'maria@gmail.com']))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('users', ['email' => 'maria@gmail.com']);
    }

    public function test_the_domain_is_the_part_after_the_last_at_sign(): void
    {
        $this->assertSame('gmail.com', EmailCheck::domainOf('Maria@Gmail.COM'));
        $this->assertSame('gmail.com', EmailCheck::domainOf('"odd@name"@gmail.com'));
        $this->assertNull(EmailCheck::domainOf('no-at-sign'));
        $this->assertNull(EmailCheck::domainOf('trailing@'));
    }

    // ---------------------------------------------------------------
    // Strict mode: sample domains and domains that do not exist
    // ---------------------------------------------------------------

    public function test_strict_mode_refuses_sample_addresses(): void
    {
        config(['marketplace.email.strict' => true]);

        foreach (['someone@example.com', 'someone@example.org', 'someone@example.net'] as $email) {
            $this->assertStringContainsString('sample address', $this->emailError($email), $email);
        }
    }

    public function test_strict_mode_refuses_a_domain_that_does_not_exist(): void
    {
        config(['marketplace.email.strict' => true]);

        // ".invalid" is reserved: it can never have DNS records, online or offline.
        $message = $this->emailError('maria@no-such-domain-for-testing.invalid');

        $this->assertStringContainsString('could not find a mail server', $message);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_without_strict_mode_sample_domains_still_work_for_local_development(): void
    {
        config(['marketplace.email.strict' => false]);

        $this->post('/register', $this->registration(['email' => 'dev@example.com']))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('users', ['email' => 'dev@example.com']);
    }

    public function test_misspellings_are_refused_even_without_strict_mode(): void
    {
        config(['marketplace.email.strict' => false]);

        $this->assertStringContainsString('Did you mean', $this->emailError('test@emaill.com'));
        $this->assertStringContainsString('disposable', $this->emailError('x@mailinator.com'));
    }

    public function test_the_existing_account_check_still_runs_after_the_new_one(): void
    {
        User::factory()->create(['email' => 'taken@gmail.com']);

        $this->assertStringContainsString('already exists', $this->emailError('taken@gmail.com'));
    }
}
