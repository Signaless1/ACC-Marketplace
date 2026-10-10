<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function validRegistration(array $overrides = []): array
    {
        return array_merge([
            'name' => "Juan Dela Cruz",
            'email' => 'juan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $overrides);
    }

    public function test_user_can_register_with_valid_data(): void
    {
        $this->post('/register', $this->validRegistration())
            ->assertRedirect('/dashboard');

        $user = User::where('email', 'juan@example.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->assertAuthenticatedAs($user);
    }

    public function test_name_and_email_are_normalised(): void
    {
        $this->post('/register', $this->validRegistration([
            'name' => "  Maria   Clara  ",
            'email' => '  Maria@Example.COM ',
        ]));

        $this->assertDatabaseHas('users', [
            'name' => 'Maria Clara',
            'email' => 'maria@example.com',
        ]);
    }

    public function test_name_rules(): void
    {
        $this->post('/register', $this->validRegistration(['name' => str_repeat('a', 61)]))
            ->assertSessionHasErrors('name');
        $this->post('/register', $this->validRegistration(['name' => 'A']))
            ->assertSessionHasErrors('name');
        $this->post('/register', $this->validRegistration(['name' => 'Bot123']))
            ->assertSessionHasErrors('name');
        $this->post('/register', $this->validRegistration(['name' => '<script>alert(1)</script>']))
            ->assertSessionHasErrors('name');

        $this->post('/register', $this->validRegistration(['name' => "Ma. Ñoño O'Neil-Reyes"]))
            ->assertSessionDoesntHaveErrors('name');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_email_rules(): void
    {
        foreach (['not-an-email', 'a@', '@b.com', str_repeat('a', 250).'@x.com'] as $bad) {
            $this->post('/register', $this->validRegistration(['email' => $bad]))
                ->assertSessionHasErrors('email');
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_duplicate_email_is_rejected_regardless_of_case(): void
    {
        $this->post('/register', $this->validRegistration());
        auth()->logout();

        $this->post('/register', $this->validRegistration(['email' => 'JUAN@example.com', 'name' => 'Other Person']))
            ->assertSessionHasErrors('email');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_password_rules(): void
    {
        $cases = [
            'short' => 'abc123',
            'no number' => 'onlyletters',
            'no letter' => '1234567890',
            'too long' => str_repeat('a1', 37), // 74 chars
        ];

        foreach ($cases as $label => $password) {
            $this->post('/register', $this->validRegistration([
                'password' => $password,
                'password_confirmation' => $password,
            ]))->assertSessionHasErrors("password");
        }

        $this->post('/register', $this->validRegistration(['password_confirmation' => 'different1']))
            ->assertSessionHasErrors('password');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_user_cannot_register_as_admin(): void
    {
        $this->post('/register', $this->validRegistration(['role' => 'admin']));

        $this->assertSame('user', User::first()->role);
    }

    public function test_login_works_and_email_is_case_insensitive(): void
    {
        User::factory()->create(['email' => 'Mixed.Case@Example.com', 'password' => 'password123']);

        $this->post('/login', ['email' => 'mixed.case@example.com', 'password' => 'password123'])
            ->assertRedirect('/dashboard');
        $this->assertAuthenticated();
    }

    public function test_login_with_wrong_password_fails_with_generic_message(): void
    {
        User::factory()->create(['email' => 'a@example.com', 'password' => 'password123']);

        $this->post('/login', ['email' => 'a@example.com', 'password' => 'wrong-password1'])
            ->assertSessionHasErrors('email');
        $this->post('/login', ['email' => 'nobody@example.com', 'password' => 'wrong-password1'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_login_is_locked_after_too_many_attempts(): void
    {
        User::factory()->create(['email' => 'a@example.com', 'password' => 'password123']);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['email' => 'a@example.com', 'password' => 'wrong-password1']);
        }

        // Even the correct password is refused while locked out.
        $response = $this->post('/login', ['email' => 'a@example.com', 'password' => 'password123']);

        $response->assertSessionHasErrors('email');
        $this->assertStringContainsString(
            'Too many login attempts',
            session('errors')->first('email')
        );
        $this->assertGuest();
    }

    public function test_suspended_user_cannot_log_in(): void
    {
        User::factory()->create([
            'email' => 'a@example.com',
            'password' => 'password123',
            'suspended_at' => now(),
        ]);

        $this->post('/login', ['email' => 'a@example.com', 'password' => 'password123'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_logged_in_users_are_redirected_away_from_login_and_register(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/login')->assertRedirect('/dashboard');
        $this->actingAs($user)->get('/register')->assertRedirect('/dashboard');
    }

    public function test_security_headers_are_sent(): void
    {
        $this->get('/login')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_landing_login_and_register_pages_render(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn ($p) => $p->component('Home'));
        $this->get('/login')->assertOk()->assertInertia(fn ($p) => $p->component('Login'));
        $this->get('/register')->assertOk()->assertInertia(fn ($p) => $p->component('Register'));
    }
}
