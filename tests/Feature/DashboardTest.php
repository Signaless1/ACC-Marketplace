<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_guest_is_sent_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_member_dashboard_has_selling_and_buying_numbers(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 4, 'price' => 250]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2]);
        $order = $listing->orders()->first();

        $this->actingAs($seller)->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('mode', 'member')
                ->where('stats.orders_to_confirm', 1)
                ->where('stats.active_listings', 1)
                ->where('attention.0.href', '/orders')
                ->has('recentOrders', 1)
                ->has('salesChart', 6));

        $this->actingAs($seller)->post("/orders/{$order->id}/confirm");
        $this->actingAs($buyer)->post("/orders/{$order->id}/complete");

        $this->actingAs($seller)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('stats.completed_sales', 1)
                ->where('stats.earnings', fn ($value) => (float) $value === 500.0));

        // The buyer is nudged to leave a review.
        $this->actingAs($buyer)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('stats.purchases', 1)
                ->where('attention.0.href', '/reviews'));
    }

    public function test_seller_is_told_when_a_moderator_removed_their_listing(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller, ['title' => 'Fake sneakers']);

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", [
            'reason' => 'scam',
            'note' => 'Counterfeit goods.',
        ]);

        $this->actingAs($seller)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('attention.0.tone', 'danger')
                ->where('attention.0.href', "/listings/{$listing->id}"));
    }

    public function test_admin_sees_the_moderation_dashboard(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        Report::create([
            'reporter_id' => User::factory()->create()->id,
            'listing_id' => $listing->id,
            'reported_user_id' => $seller->id,
            'reason' => 'spam',
        ]);

        $this->actingAs($admin)->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('mode', 'admin')
                ->where('stats.pending_reports', 1)
                ->has('queue', 1)
                ->where('queue.0.kind', 'listing')
                ->has('activity.users', 14));
    }

    public function test_partial_reload_only_returns_requested_props(): void
    {
        $user = User::factory()->create();

        // Use the app's real asset version, so the test also passes after `npm run build`.
        $version = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());

        $this->actingAs($user)
            ->get('/dashboard', [
                'X-Inertia' => 'true',
                'X-Inertia-Partial-Component' => 'Dashboard',
                'X-Inertia-Partial-Data' => 'stats',
                'X-Inertia-Version' => (string) $version,
            ])
            ->assertOk()
            ->assertJsonPath('props.stats.active_listings', 0)
            ->assertJsonMissingPath('props.recommended');
    }

    public function test_live_endpoint_reports_unread_messages(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);

        // Starting a chat creates the conversation; then the buyer writes in it.
        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");
        $conversation = \App\Models\Conversation::first();
        $this->actingAs($buyer)->post("/messages/{$conversation->id}", ['body' => 'Is this still available?']);

        $this->actingAs($seller)->getJson('/live')
            ->assertOk()
            ->assertJsonPath('unreadMessageCount', 1)
            ->assertJsonPath('latestMessage.preview', 'Is this still available?');
    }

    public function test_live_endpoint_requires_login(): void
    {
        $this->getJson('/live')->assertUnauthorized();
    }
}
