<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

/**
 * Opens every page a member and an admin can reach, to catch server errors
 * (missing relations, bad queries, typos in props) in one place.
 */
class SmokeTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_every_member_page_renders(): void
    {
        Storage::fake('local');

        // Public pages, as a guest.
        foreach (['/', '/login', '/register', '/marketplace'] as $page) {
            $this->get($page)->assertOk();
        }

        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 3]);
        $listing->images()->create(['path' => 'listings/a.jpg', 'sort_order' => 0]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 1]);
        $order = $listing->orders()->first();
        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");
        $conversation = Conversation::first();
        $this->actingAs($buyer)->post("/messages/{$conversation->id}", ['body' => 'hi']);
        $this->actingAs($buyer)->post("/listings/{$listing->id}/favorite");

        $pages = [
            '/',
            '/dashboard', '/marketplace', '/marketplace?q=calc&sort=popular&min_rating=3',
            '/favorites', '/listings', '/listings/create',
            "/listings/{$listing->id}", '/messages', "/messages/{$conversation->id}",
            '/orders', "/orders/{$order->id}/report", '/reviews', '/settings',
            "/users/{$seller->id}", "/users/{$buyer->id}",
        ];

        foreach ($pages as $page) {
            $this->actingAs($buyer)->get($page)->assertOk();
        }

        // Logged-in users are sent away from the login and register pages.
        $this->actingAs($buyer)->get('/login')->assertRedirect('/dashboard');

        // Pages only the owner can open.
        $this->actingAs($seller)->get("/listings/{$listing->id}/edit")->assertOk();
        $this->actingAs($seller)->get('/orders')->assertOk();
        $this->actingAs($seller)->get('/dashboard')->assertOk();
    }

    public function test_every_admin_page_renders(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);
        $this->actingAs($buyer)->post("/listings/{$listing->id}/order");
        $order = $listing->orders()->first();

        Report::create([
            'reporter_id' => $buyer->id,
            'order_id' => $order->id,
            'listing_id' => $listing->id,
            'reported_user_id' => $seller->id,
            'reason' => 'no_show',
            'description' => 'Did not show up at the agreed place.',
        ]);

        $pages = [
            '/dashboard', '/admin/users', '/admin/users?status=suspended&q=a',
            '/admin/listings', '/admin/listings?visibility=removed',
            '/admin/orders', '/admin/orders?status=reported',
            '/admin/reports', '/admin/reports?status=all', '/admin/reports?status=escalated',
            "/orders/{$order->id}/report", "/users/{$seller->id}", "/listings/{$listing->id}",
        ];

        foreach ($pages as $page) {
            $this->actingAs($admin)->get($page)->assertOk();
        }
    }
}
