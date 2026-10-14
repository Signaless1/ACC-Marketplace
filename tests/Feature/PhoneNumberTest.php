<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PhilippinePhone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhoneNumberTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'phone' => '09171234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $overrides);
    }

    public function test_normalizer_accepts_every_common_way_of_typing_a_mobile_number(): void
    {
        foreach ([
            '09171234567',
            '0917 123 4567',
            '0917-123-4567',
            '(0917) 123-4567',
            '+639171234567',
            '+63 917 123 4567',
            '639171234567',
            '  09171234567  ',
        ] as $input) {
            $this->assertSame('09171234567', PhilippinePhone::normalize($input), "input: {$input}");
        }
    }

    public function test_normalizer_rejects_everything_else(): void
    {
        foreach ([
            '', '   ', null, 12345,
            '0917123456',        // 10 digits: one short
            '091712345678',      // 12 digits: one too many
            '9171234567',        // missing the leading 0
            '08171234567',       // does not start with 09
            '0281234567',        // Manila landline
            '+63281234567',      // landline in international form
            '+6391712345678',    // too long in international form
            '+63917123456',      // too short in international form
            '+09171234567',      // "+" only belongs in front of 63
            '+19171234567',      // another country
            '0917abc4567',       // letters
            '0917 123 45x7',
            '09171234567; DROP',
            '09-17-12-34-56-7a',
        ] as $input) {
            $this->assertNull(PhilippinePhone::normalize($input), 'input: '.var_export($input, true));
        }
    }

    public function test_phone_is_required_at_registration(): void
    {
        $this->post('/register', $this->registration(['phone' => '']))
            ->assertSessionHasErrors('phone');

        $payload = $this->registration();
        unset($payload['phone']);
        $this->post('/register', $payload)->assertSessionHasErrors('phone');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_rejects_invalid_numbers(): void
    {
        foreach (['0917123456', '091712345678', '12345', 'abcdefghijk', '0281234567', '+14155552671'] as $bad) {
            $this->post('/register', $this->registration(['phone' => $bad]))
                ->assertSessionHasErrors('phone');
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_stores_the_number_in_one_canonical_form(): void
    {
        $this->post('/register', $this->registration(['phone' => '+63 917 123 4567']))
            ->assertRedirect('/dashboard');

        $this->assertSame('09171234567', User::first()->phone);
    }

    public function test_same_number_cannot_be_used_twice_even_in_a_different_format(): void
    {
        $this->post('/register', $this->registration());
        auth()->logout();

        $this->post('/register', $this->registration([
            'email' => 'other@example.com',
            'phone' => '+639171234567',
        ]))->assertSessionHasErrors('phone');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_existing_accounts_without_a_number_still_work(): void
    {
        $user = User::factory()->create(['phone' => null, 'email' => 'old@example.com', 'password' => 'password123']);

        $this->post('/login', ['email' => 'old@example.com', 'password' => 'password123'])
            ->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    public function test_phone_is_never_exposed_to_other_users(): void
    {
        $seller = User::factory()->create(['phone' => '09179998888']);
        $viewer = User::factory()->create();

        $json = $this->actingAs($viewer)->get("/users/{$seller->id}")->assertOk()->content();
        $this->assertStringNotContainsString('09179998888', $json);
        $this->assertStringNotContainsString('639179998888', $json);
    }

    public function test_owner_sees_their_own_number_in_shared_props(): void
    {
        $user = User::factory()->create(['phone' => '09175551234']);

        $this->actingAs($user)->get('/settings')
            ->assertInertia(fn ($page) => $page->where('auth.user.phone', '09175551234'));
    }

    public function test_user_can_change_their_number_in_settings(): void
    {
        $user = User::factory()->create(['phone' => '09171111111']);

        $this->actingAs($user)->post('/settings/profile', [
            'name' => $user->name,
            'phone' => '0918 222 3333',
        ])->assertSessionHasNoErrors();

        $this->assertSame('09182223333', $user->fresh()->phone);

        $this->actingAs($user)->post('/settings/profile', ['name' => $user->name, 'phone' => '12345'])
            ->assertSessionHasErrors('phone');
        $this->assertSame('09182223333', $user->fresh()->phone);
    }

    public function test_settings_cannot_steal_someone_elses_number_or_blank_the_number(): void
    {
        User::factory()->create(['phone' => '09170000001']);
        $user = User::factory()->create(['phone' => '09170000002']);

        $this->actingAs($user)->post('/settings/profile', ['name' => $user->name, 'phone' => '09170000001'])
            ->assertSessionHasErrors('phone');

        $this->actingAs($user)->post('/settings/profile', ['name' => $user->name, 'phone' => ''])
            ->assertSessionHasErrors('phone');

        // Re-saving your own number is not a duplicate.
        $this->actingAs($user)->post('/settings/profile', ['name' => $user->name, 'phone' => '09170000002'])
            ->assertSessionHasNoErrors();

        $this->assertSame('09170000002', $user->fresh()->phone);
    }

    public function test_old_account_can_add_a_number_but_may_leave_it_empty(): void
    {
        $user = User::factory()->create(['phone' => null]);

        $this->actingAs($user)->post('/settings/profile', ['name' => $user->name, 'phone' => ''])
            ->assertSessionHasNoErrors();
        $this->assertNull($user->fresh()->phone);

        $this->actingAs($user)->post('/settings/profile', ['name' => $user->name, 'phone' => '09171234567'])
            ->assertSessionHasNoErrors();
        $this->assertSame('09171234567', $user->fresh()->phone);
    }
}
