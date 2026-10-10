<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Favorite;
use App\Models\Message;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_guests_are_redirected(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_new_user_sees_onboarding_state(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('isNewUser', true)
                ->where('stats', ['available' => 0, 'reserved' => 0, 'sold' => 0])
                ->where('savedCount', 0)
                ->where('reviewableCount', 0)
                ->where('attention.unread_messages', 0)
                ->has('recentConversations', 0));
    }

    public function test_listing_counts_come_from_the_database_and_only_count_my_listings(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();

        $this->makeListing($me, ['status' => 'available']);
        $this->makeListing($me, ['status' => 'available']);
        $this->makeListing($me, ['status' => 'reserved']);
        $this->makeListing($me, ['status' => 'sold']);
        $this->makeListing($me, ['status' => 'sold']);
        $this->makeListing($me, ['status' => 'sold']);
        $this->makeListing($other, ['status' => 'available']);

        $this->actingAs($me)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('stats', ['available' => 2, 'reserved' => 1, 'sold' => 3])
                ->where('isNewUser', false));
    }

    public function test_saved_listings_are_mine_visible_and_limited_but_counted_in_full(): void
    {
        $me = User::factory()->create();
        $seller = User::factory()->create();
        $someoneElse = User::factory()->create();

        for ($i = 0; $i < 6; $i++) {
            Favorite::create(['user_id' => $me->id, 'listing_id' => $this->makeListing($seller, ['title' => "Saved {$i}"])->id]);
        }

        $hidden = $this->makeListing($seller, ['title' => 'Hidden', 'hidden_at' => now()]);
        Favorite::create(['user_id' => $me->id, 'listing_id' => $hidden->id]);

        Favorite::create(['user_id' => $someoneElse->id, 'listing_id' => $this->makeListing($seller, ['title' => 'Not mine'])->id]);

        $this->actingAs($me)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('savedCount', 6)
                ->has('savedListings', 4)
                ->where('savedListings.0.title', 'Saved 5')
                ->has('savedListings.0.images')
                ->has('savedListings.0.category'));
    }

    public function test_reviewable_orders_only_include_my_completed_unreviewed_purchases(): void
    {
        $me = User::factory()->create();
        $john = User::factory()->create(['name' => 'John Doe']);

        $reviewable = $this->makeOrder($this->makeListing($john, ['title' => 'Mechanical Keyboard']), $me, 'completed');
        $this->makeOrder($this->makeListing($john, ['title' => 'Still pending']), $me, 'pending');

        $reviewedOrder = $this->makeOrder($this->makeListing($john, ['title' => 'Already reviewed']), $me, 'completed');
        Review::create([
            'order_id' => $reviewedOrder->id,
            'listing_id' => $reviewedOrder->listing_id,
            'reviewer_id' => $me->id,
            'seller_id' => $john->id,
            'rating' => 5,
        ]);

        // Someone else's purchase must not show up.
        $this->makeOrder($this->makeListing($john, ['title' => 'Other buyer']), User::factory()->create(), 'completed');

        $this->actingAs($me)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('reviewableCount', 1)
                ->has('reviewableOrders', 1)
                ->where('reviewableOrders.0.id', $reviewable->id)
                ->where('reviewableOrders.0.seller.name', 'John Doe')
                ->where('reviewableOrders.0.listing.title', 'Mechanical Keyboard')
                ->where('attention.reviews_to_leave', 1));
    }

    public function test_recent_conversations_show_last_message_other_user_and_unread(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create(['name' => 'Maria Santos']);
        $listing = $this->makeListing($other, ['title' => 'Calculator']);
        $conversation = Conversation::create(['listing_id' => $listing->id, 'buyer_id' => $me->id, 'seller_id' => $other->id]);

        Message::create(['conversation_id' => $conversation->id, 'sender_id' => $me->id, 'body' => 'Is this still available?']);
        Message::create(['conversation_id' => $conversation->id, 'sender_id' => $other->id, 'body' => 'Yes, it is!']);

        // A conversation I am not part of.
        $a = User::factory()->create();
        $b = User::factory()->create();
        $c = Conversation::create(['listing_id' => $this->makeListing($b)->id, 'buyer_id' => $a->id, 'seller_id' => $b->id]);
        Message::create(['conversation_id' => $c->id, 'sender_id' => $a->id, 'body' => 'private']);

        $this->actingAs($me)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('recentConversations', 1)
                ->where('recentConversations.0.other_user.name', 'Maria Santos')
                ->where('recentConversations.0.listing.title', 'Calculator')
                ->where('recentConversations.0.last_message.body', 'Yes, it is!')
                ->where('recentConversations.0.last_message.from_me', false)
                ->where('recentConversations.0.unread_count', 1)
                ->where('attention.unread_messages', 1));
    }

    public function test_orders_needing_action_are_counted_for_the_right_party(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();

        $this->makeOrder($this->makeListing($seller), $buyer, 'pending');
        $this->makeOrder($this->makeListing($seller), $buyer, 'confirmed');

        $this->actingAs($seller)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('attention.orders_to_confirm', 1)
                ->where('attention.orders_to_complete', 1));

        // The buyer cannot confirm, only complete.
        $this->actingAs($buyer)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('attention.orders_to_confirm', 0)
                ->where('attention.orders_to_complete', 1));
    }

    public function test_recent_listings_exclude_my_own_hidden_and_unavailable_ones(): void
    {
        $me = User::factory()->create();
        $seller = User::factory()->create();

        $this->makeListing($me, ['title' => 'Mine']);
        $this->makeListing($seller, ['title' => 'Visible']);
        $this->makeListing($seller, ['title' => 'Hidden', 'hidden_at' => now()]);
        $this->makeListing($seller, ['title' => 'Sold', 'status' => 'sold']);

        $this->actingAs($me)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('recentListings', 1)
                ->where('recentListings.0.title', 'Visible'));
    }

    public function test_category_counts_are_real_visible_available_listings(): void
    {
        $me = User::factory()->create();
        $seller = User::factory()->create();

        $electronics = $this->makeCategory('Electronics');
        $books = $this->makeCategory('Books');

        $this->makeListing($seller, ['category_id' => $electronics->id]);
        $this->makeListing($seller, ['category_id' => $electronics->id]);
        $this->makeListing($seller, ['category_id' => $electronics->id, 'status' => 'sold']);
        $this->makeListing($seller, ['category_id' => $books->id]);

        $this->actingAs($me)->get('/dashboard')
            ->assertInertia(fn ($page) => $page
                ->where('categories.0.name', 'Electronics')
                ->where('categories.0.listings_count', 2)
                ->where('categories.1.name', 'Books')
                ->where('categories.1.listings_count', 1));
    }

    public function test_my_listings_status_filter(): void
    {
        $me = User::factory()->create();
        $this->makeListing($me, ['title' => 'A', 'status' => 'available']);
        $this->makeListing($me, ['title' => 'S', 'status' => 'sold']);

        $this->actingAs($me)->get('/listings?status=sold')
            ->assertInertia(fn ($page) => $page
                ->has('listings.data', 1)
                ->where('listings.data.0.title', 'S')
                ->where('status', 'sold'));
    }

    private function dashboardQueryCount(User $me): int
    {
        \DB::flushQueryLog();
        \DB::enableQueryLog();
        $this->actingAs($me)->get('/dashboard')->assertOk();
        $count = count(\DB::getQueryLog());
        \DB::disableQueryLog();

        return $count;
    }

    private function seedActivity(User $me, User $seller, int $rows): void
    {
        for ($i = 0; $i < $rows; $i++) {
            $other = User::factory()->create();
            $listing = $this->makeListing($other);
            Favorite::create(['user_id' => $me->id, 'listing_id' => $listing->id]);
            $conversation = Conversation::create(['listing_id' => $listing->id, 'buyer_id' => $me->id, 'seller_id' => $other->id]);
            Message::create(['conversation_id' => $conversation->id, 'sender_id' => $other->id, 'body' => 'hi']);
            $this->makeOrder($this->makeListing($seller), $me, 'completed');
        }
    }

    public function test_dashboard_query_count_does_not_grow_with_data(): void
    {
        $me = User::factory()->create();
        $seller = User::factory()->create();

        $this->seedActivity($me, $seller, 2);
        $few = $this->dashboardQueryCount($me);

        $this->seedActivity($me, $seller, 6);
        $many = $this->dashboardQueryCount($me);

        // 4x the favorites/conversations/orders, identical query count: no N+1.
        $this->assertSame($few, $many);
    }
}
