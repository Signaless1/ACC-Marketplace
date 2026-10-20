<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class PhoneNumberTest extends TestCase
{
    use CreatesMarketplaceData;
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

    // ---------------------------------------------------------------
    // The number itself
    // ---------------------------------------------------------------

    public function test_normalize_turns_every_common_spelling_into_one_canonical_number(): void
    {
        $typed = [
            '09171234567',
            '0917 123 4567',
            '0917-123-4567',
            '+639171234567',
            '+63 917 123 4567',
            '639171234567',
            '9171234567',
            '(0917) 123-4567',
            "0917\u{00A0}123\u{00A0}4567", // non-breaking spaces from copy and paste
            '  09171234567  ',
        ];

        foreach ($typed as $value) {
            $this->assertSame('+639171234567', PhoneNumber::normalize($value), "Typed as: {$value}");
        }
    }

    public function test_normalize_rejects_anything_that_is_not_a_philippine_mobile_number(): void
    {
        $rejected = [
            '', '   ', null, 123456789,
            '0917123456',          // one digit short
            '091712345678',        // one digit too many
            '08171234567',         // mobile numbers start with 09
            '+1 415 555 2671',     // a US number
            '+63 2 8123 4567',     // a Manila landline
            '(032) 255 1234',      // a Cebu landline
            '0917 abc 4567',
            '09171234567x',
            '+9171234567',         // "+" must be followed by the country code 63
            '++639171234567',
            '09000000000',         // placeholders
            '09999999999',
            '+639111111111',
        ];

        foreach ($rejected as $value) {
            $this->assertNull(PhoneNumber::normalize($value), 'Should be rejected: '.var_export($value, true));
        }
    }

    public function test_display_formats_the_number_the_way_people_read_it(): void
    {
        $this->assertSame('0917 123 4567', PhoneNumber::display('+639171234567'));
        $this->assertNull(PhoneNumber::display(null));
    }

    // ---------------------------------------------------------------
    // Signing up
    // ---------------------------------------------------------------

    public function test_every_common_way_of_typing_the_number_signs_up_and_is_stored_one_way(): void
    {
        foreach (['09171234567', '0917 123 4567', '+63 917 123 4567', '639171234567', '9171234567'] as $typed) {
            $this->post('/register', $this->registration(['phone' => $typed]))
                ->assertSessionHasNoErrors();

            $this->assertSame(
                '+639171234567',
                User::query()->firstOrFail()->phone,
                "Typed as: {$typed}"
            );

            auth()->logout();
            User::query()->delete();
        }
    }

    public function test_numbers_that_are_not_philippine_mobile_numbers_cannot_sign_up(): void
    {
        $bad = [
            '0917123456', '091712345678', '08171234567', '+1 415 555 2671',
            '+63 2 8123 4567', '(032) 255 1234', '0917 abc 4567', '09000000000', 'not a number',
        ];

        foreach ($bad as $value) {
            $this->post('/register', $this->registration(['phone' => $value]))
                ->assertSessionHasErrors('phone');
        }

        $this->assertDatabaseCount('users', 0);
    }

    public function test_a_phone_number_is_required_to_sign_up(): void
    {
        $data = $this->registration();
        unset($data['phone']);

        $this->post('/register', $data)->assertSessionHasErrors('phone');
        $this->post('/register', $this->registration(['phone' => '']))->assertSessionHasErrors('phone');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_one_number_cannot_back_two_accounts_however_it_is_typed(): void
    {
        $this->post('/register', $this->registration(['phone' => '0917 123 4567']))
            ->assertSessionHasNoErrors();
        auth()->logout();

        $this->post('/register', $this->registration([
            'email' => 'second@example.com',
            'phone' => '+63 917-123-4567',
        ]))->assertSessionHasErrors('phone');

        $this->assertDatabaseCount('users', 1);
    }

    public function test_the_sign_up_page_still_renders(): void
    {
        $this->get('/register')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Register'));
    }

    // ---------------------------------------------------------------
    // Changing it later
    // ---------------------------------------------------------------

    public function test_a_user_can_change_their_number_but_not_blank_it_or_take_someone_elses(): void
    {
        $user = User::factory()->create(['phone' => '+639171111222']);
        $other = User::factory()->create(['phone' => '+639182223333']);

        $this->actingAs($user)->post('/settings/profile', ['name' => 'Juan Dela Cruz', 'phone' => '0918 765 4321'])
            ->assertSessionHasNoErrors();
        $this->assertSame('+639187654321', $user->fresh()->phone);

        // Somebody else's number, typed differently.
        $this->actingAs($user)->post('/settings/profile', ['name' => 'Juan Dela Cruz', 'phone' => '+63 918 222 3333'])
            ->assertSessionHasErrors('phone');

        // Cannot be emptied.
        $this->actingAs($user)->post('/settings/profile', ['name' => 'Juan Dela Cruz', 'phone' => ''])
            ->assertSessionHasErrors('phone');

        // Not a mobile number.
        $this->actingAs($user)->post('/settings/profile', ['name' => 'Juan Dela Cruz', 'phone' => '12345'])
            ->assertSessionHasErrors('phone');

        // Sending your own current number again is fine.
        $this->actingAs($user)->post('/settings/profile', ['name' => 'Juan Dela Cruz', 'phone' => '09187654321'])
            ->assertSessionHasNoErrors();

        $this->assertSame('+639187654321', $user->fresh()->phone);
        $this->assertSame('+639182223333', $other->fresh()->phone);
    }

    public function test_the_settings_page_receives_the_owners_own_number(): void
    {
        $user = User::factory()->create(['phone' => '+639171234567']);

        $this->actingAs($user)->get('/settings')
            ->assertInertia(fn (Assert $page) => $page->where('auth.user.phone', '+639171234567'));
    }

    public function test_older_accounts_without_a_number_are_asked_to_add_one(): void
    {
        $user = User::factory()->withoutPhone()->create();

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page->where(
                'attention',
                fn ($items) => collect($items)->pluck('title')->contains('Add your mobile number')
            ));

        $user->forceFill(['phone' => '+639171234567'])->save();

        $this->actingAs($user)->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page->where(
                'attention',
                fn ($items) => ! collect($items)->pluck('title')->contains('Add your mobile number')
            ));
    }

    // ---------------------------------------------------------------
    // Privacy: the number belongs to the owner and the admins, nobody else
    // ---------------------------------------------------------------

    public function test_a_phone_number_is_never_shown_to_other_people(): void
    {
        $sellerPhone = '+639178881111';
        $buyerPhone = '+639179992222';

        $seller = User::factory()->create(['phone' => $sellerPhone]);
        $buyer = User::factory()->create(['phone' => $buyerPhone]);
        $listing = $this->makeListing($seller);
        $order = $this->makeOrder($listing, $buyer, 'confirmed');

        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");
        $conversation = $seller->sellerConversations()->firstOrFail();

        $pages = [
            '/marketplace',
            "/listings/{$listing->id}",
            "/users/{$seller->id}",
            '/messages',
            "/messages/{$conversation->id}",
            '/orders',
            "/orders/{$order->id}/report",
        ];

        foreach ($pages as $url) {
            $this->actingAs($buyer)->get($url)->assertOk()->assertDontSee($sellerPhone, false);
        }

        // ...and the other way round.
        foreach (['/orders', "/orders/{$order->id}/report", '/messages', "/users/{$buyer->id}"] as $url) {
            $this->actingAs($seller)->get($url)->assertOk()->assertDontSee($buyerPhone, false);
        }
    }

    public function test_admins_can_see_and_search_by_phone_number(): void
    {
        $admin = $this->makeAdmin();
        $member = User::factory()->create(['name' => 'Maria Santos', 'phone' => '+639171234567']);
        User::factory()->create(['name' => 'Someone Else']);

        $this->actingAs($admin)->get('/admin/users')
            ->assertInertia(fn (Assert $page) => $page->where(
                'users.data',
                fn ($rows) => collect($rows)->contains(fn ($row) => ($row['phone'] ?? null) === '+639171234567')
            ));

        // Typed the way people actually write it, not the way it is stored.
        $this->actingAs($admin)->get('/admin/users?q='.urlencode('0917 123 4567'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.name', 'Maria Santos'));

        // Ordinary members cannot open the admin list at all.
        $this->actingAs($member)->get('/admin/users')->assertForbidden();
    }

    public function test_the_transaction_report_shows_phone_numbers_to_admins_only(): void
    {
        $seller = User::factory()->create(['phone' => '+639178881111']);
        $buyer = User::factory()->create(['phone' => '+639179992222']);
        $order = $this->makeOrder($this->makeListing($seller), $buyer, 'confirmed');
        $admin = $this->makeAdmin();

        $this->actingAs($admin)->get("/orders/{$order->id}/report")
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.seller.phone', '+639178881111')
                ->where('summary.buyer.phone', '+639179992222'));

        $this->actingAs($buyer)->get("/orders/{$order->id}/report")
            ->assertInertia(fn (Assert $page) => $page
                ->missing('summary.seller.phone')
                ->missing('summary.buyer.phone'));
    }
}
