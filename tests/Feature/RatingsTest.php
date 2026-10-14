<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class RatingsTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function reviewed(User $seller, int $productRating, string $title = 'Calculator'): \App\Models\Listing
    {
        $listing = $this->makeListing($seller, ['title' => $title, 'quantity' => 5]);
        $buyer = User::factory()->create();
        $order = $this->makeOrder($listing, $buyer, 'completed');

        Review::create([
            'order_id' => $order->id,
            'listing_id' => $listing->id,
            'reviewer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'rating' => 5,
            'product_rating' => $productRating,
            'comment' => 'ok',
        ]);

        return $listing;
    }

    public function test_marketplace_cards_carry_the_product_rating(): void
    {
        $seller = User::factory()->create();
        $good = $this->reviewed($seller, 5, 'Great one');
        $this->reviewed($seller, 3, 'Meh one');
        $this->makeListing($seller, ['title' => 'Unrated one']);

        $this->get('/marketplace?sort=top_rated')
            ->assertInertia(fn ($page) => $page
                ->where('listings.data.0.title', 'Great one')
                ->where('listings.data.0.rating_count', 1)
                ->where('listings.data.0.rating_avg', fn ($v) => (float) $v === 5.0));

        $this->get('/marketplace?min_rating=4')
            ->assertInertia(fn ($page) => $page
                ->has('listings.data', 1)
                ->where('listings.data.0.id', $good->id));
    }

    public function test_product_page_shows_breakdown_reviews_and_related_listings(): void
    {
        $seller = User::factory()->create();
        $viewer = User::factory()->create();
        $listing = $this->reviewed($seller, 4, 'Main item');
        $this->makeListing($seller, ['title' => 'Same seller item']);
        $this->makeListing(User::factory()->create(), ['title' => 'Same category item']);

        $this->actingAs($viewer)->get("/listings/{$listing->id}")
            ->assertInertia(fn ($page) => $page
                ->component('Listings/Show')
                ->where('listing.rating_count', 1)
                ->where('ratingBreakdown.4', 1)
                ->where('ratingBreakdown.5', 0)
                ->where('soldUnits', 1)
                ->has('reviews', 1)
                ->where('reviews.0.product_rating', 4)
                ->has('sellerOtherListings', 1)
                ->has('similarListings', 1));
    }

    public function test_buyer_is_offered_a_review_only_for_their_own_unreviewed_completed_order(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $other = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold']);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        $this->actingAs($buyer)->get("/listings/{$listing->id}")
            ->assertInertia(fn ($page) => $page->where('reviewableOrder.id', $order->id));

        $this->actingAs($other)->get("/listings/{$listing->id}")
            ->assertInertia(fn ($page) => $page->where('reviewableOrder', null));

        $this->actingAs($seller)->get("/listings/{$listing->id}")
            ->assertInertia(fn ($page) => $page->where('reviewableOrder', null));
    }

    public function test_views_count_once_per_session_and_never_for_the_owner(): void
    {
        $seller = User::factory()->create();
        $viewer = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($seller)->get("/listings/{$listing->id}");
        $this->assertSame(0, (int) $listing->fresh()->views_count);

        $this->actingAs($viewer)->get("/listings/{$listing->id}");
        $this->get("/listings/{$listing->id}");
        $this->assertSame(1, (int) $listing->fresh()->views_count);
    }

    public function test_review_still_requires_both_ratings(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $order = $this->makeOrder($this->makeListing($seller, ['status' => 'sold']), $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 5])
            ->assertSessionHasErrors('product_rating');
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['product_rating' => 5])
            ->assertSessionHasErrors('rating');
    }
}
