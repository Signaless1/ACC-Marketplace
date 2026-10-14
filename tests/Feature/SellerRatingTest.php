<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\User;
use App\Support\SellerRating;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class SellerRatingTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    /** Create one completed order + review at the given rating. */
    private function reviewFor(User $seller, int $rating, ?string $comment = null): Review
    {
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold']);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        return Review::create([
            'order_id' => $order->id,
            'listing_id' => $listing->id,
            'reviewer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'rating' => $rating,
            'comment' => $comment,
        ]);
    }

    public function test_summary_has_average_count_and_distribution(): void
    {
        $seller = User::factory()->create();

        foreach ([5, 5, 5, 4, 2] as $rating) {
            $this->reviewFor($seller, $rating);
        }

        $summary = SellerRating::summary($seller->id);

        $this->assertSame(4.2, $summary['average']);
        $this->assertSame(5, $summary['count']);
        $this->assertSame([5 => 3, 4 => 1, 3 => 0, 2 => 1, 1 => 0], $summary['distribution']);
    }

    public function test_summary_for_seller_without_reviews_is_empty_not_zero(): void
    {
        $summary = SellerRating::summary(User::factory()->create()->id);

        $this->assertNull($summary['average']);
        $this->assertSame(0, $summary['count']);
        $this->assertSame([5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0], $summary['distribution']);
    }

    public function test_summary_only_counts_the_given_seller(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();
        $this->reviewFor($seller, 5);
        $this->reviewFor($other, 1);

        $this->assertSame(5.0, SellerRating::summary($seller->id)['average']);
    }

    public function test_profile_exposes_rating_distribution_and_reviews(): void
    {
        $seller = User::factory()->create();
        $viewer = User::factory()->create();
        $this->reviewFor($seller, 5, 'Very easy to deal with.');
        $this->reviewFor($seller, 3);

        $this->actingAs($viewer)->get("/users/{$seller->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Profile/Show')
                ->where('stats.rating', 4)
                ->where('stats.reviews_count', 2)
                ->where('stats.distribution.5', 1)
                ->where('stats.distribution.3', 1)
                ->where('stats.distribution.1', 0)
                ->has('reviews.data', 2)
                ->has('reviews.data.0.reviewer.name')
                ->where('reviewableOrders', []));
    }

    public function test_profile_active_listing_count_is_not_capped_by_the_page_size(): void
    {
        $seller = User::factory()->create();
        $viewer = User::factory()->create();

        for ($i = 0; $i < 15; $i++) {
            $this->makeListing($seller, ['title' => "Item {$i}"]);
        }

        $this->actingAs($viewer)->get("/users/{$seller->id}")
            ->assertInertia(fn ($page) => $page
                ->where('stats.active_listings', 15)
                ->has('listings', 12));
    }

    public function test_review_counts_are_not_limited_by_review_pagination(): void
    {
        $seller = User::factory()->create();
        $viewer = User::factory()->create();

        for ($i = 0; $i < 13; $i++) {
            $this->reviewFor($seller, 5);
        }

        $this->actingAs($viewer)->get("/users/{$seller->id}")
            ->assertInertia(fn ($page) => $page
                ->where('stats.reviews_count', 13)
                ->has('reviews.data', 10));
    }

    public function test_profile_lists_only_the_viewers_reviewable_orders_for_that_seller(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $stranger = User::factory()->create();

        $reviewable = $this->makeOrder($this->makeListing($seller, ['title' => 'Keyboard']), $buyer, 'completed');
        $this->makeOrder($this->makeListing($seller, ['title' => 'Pending one']), $buyer, 'pending');

        $this->actingAs($buyer)->get("/users/{$seller->id}")
            ->assertInertia(fn ($page) => $page
                ->has('reviewableOrders', 1)
                ->where('reviewableOrders.0.id', $reviewable->id)
                ->where('reviewableOrders.0.listing.title', 'Keyboard'));

        $this->actingAs($stranger)->get("/users/{$seller->id}")
            ->assertInertia(fn ($page) => $page->where('reviewableOrders', []));

        // Own profile never offers a review form.
        $this->actingAs($seller)->get("/users/{$seller->id}")
            ->assertInertia(fn ($page) => $page->where('reviewableOrders', []));
    }

    public function test_reviewable_order_disappears_after_review_and_rating_updates(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $order = $this->makeOrder($this->makeListing($seller), $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 4, 'product_rating' => 4, 'comment' => 'Good'])
            ->assertSessionHas('success');

        $this->actingAs($buyer)->get("/users/{$seller->id}")
            ->assertInertia(fn ($page) => $page
                ->where('reviewableOrders', [])
                ->where('stats.rating', 4)
                ->where('stats.reviews_count', 1)
                ->where('reviews.data.0.comment', 'Good'));
    }

    public function test_duplicate_review_does_not_change_the_rating(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $order = $this->makeOrder($this->makeListing($seller), $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 5, 'product_rating' => 5]);
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 1, 'product_rating' => 1])
            ->assertSessionHas('error');

        $summary = SellerRating::summary($seller->id);
        $this->assertSame(1, $summary['count']);
        $this->assertSame(5.0, $summary['average']);
    }

    public function test_listing_page_exposes_only_public_seller_fields_with_true_rating(): void
    {
        $seller = User::factory()->create(['email' => 'private-seller@example.com']);
        $viewer = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->reviewFor($seller, 5);
        $this->reviewFor($seller, 4);

        $response = $this->actingAs($viewer)->get("/listings/{$listing->id}");

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Listings/Show')
            ->where('listing.seller.id', $seller->id)
            ->where('listing.seller.name', $seller->name)
            ->missing('listing.seller.email')
            ->missing('listing.seller.role')
            ->missing('listing.seller.suspended_at')
            ->where('sellerRating.average', 4.5)
            ->where('sellerRating.count', 2)
            ->where('reviewableOrderId', null));

        $this->assertStringNotContainsString('private-seller@example.com', $response->getContent());
    }

    public function test_listing_page_offers_review_only_for_a_completed_unreviewed_order(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        $this->actingAs($buyer)->get("/listings/{$listing->id}")
            ->assertInertia(fn ($page) => $page->where('reviewableOrderId', $order->id));

        $this->actingAs($seller)->get("/listings/{$listing->id}")
            ->assertInertia(fn ($page) => $page->where('reviewableOrderId', null));
    }
}
