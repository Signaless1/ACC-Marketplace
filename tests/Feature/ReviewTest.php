<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function completedOrder(): array
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold']);

        return [$seller, $buyer, $this->makeOrder($listing, $buyer, 'completed')];
    }

    public function test_buyer_can_review_completed_order(): void
    {
        [$seller, $buyer, $order] = $this->completedOrder();

        $this->actingAs($buyer)
            ->post("/orders/{$order->id}/review", ['rating' => 5, 'product_rating' => 4, 'comment' => 'Great!'])
            ->assertSessionHas('success');

        $this->assertDatabaseHas('reviews', [
            'order_id' => $order->id,
            'seller_id' => $seller->id,
            'reviewer_id' => $buyer->id,
            'rating' => 5,
            'product_rating' => 4,
        ]);
    }

    public function test_cannot_review_before_completion(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $order = $this->makeOrder($this->makeListing($seller), $buyer, 'confirmed');

        $this->actingAs($buyer)
            ->post("/orders/{$order->id}/review", ['rating' => 4, 'product_rating' => 4])
            ->assertSessionHas('error');

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_cannot_review_twice(): void
    {
        [, $buyer, $order] = $this->completedOrder();

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 5, 'product_rating' => 5]);
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 1, 'product_rating' => 1])
            ->assertSessionHas('error');

        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_seller_and_strangers_cannot_review(): void
    {
        [$seller, , $order] = $this->completedOrder();
        $stranger = User::factory()->create();

        $this->actingAs($seller)->post("/orders/{$order->id}/review", ['rating' => 5, 'product_rating' => 5])->assertForbidden();
        $this->actingAs($stranger)->post("/orders/{$order->id}/review", ['rating' => 5, 'product_rating' => 5])->assertForbidden();
    }

    public function test_rating_must_be_between_one_and_five(): void
    {
        [, $buyer, $order] = $this->completedOrder();

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 6, 'product_rating' => 5])
            ->assertSessionHasErrors('rating');
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 3, 'product_rating' => 0])
            ->assertSessionHasErrors('product_rating');
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 3])
            ->assertSessionHasErrors('product_rating');
    }

    public function test_profile_shows_average_rating(): void
    {
        [$seller, $buyer, $order] = $this->completedOrder();
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 4, 'product_rating' => 4]);

        $this->actingAs($buyer)->get("/users/{$seller->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Profile/Show')
                ->where('stats.rating', 4)
                ->where('stats.reviews_count', 1)
                ->where('stats.completed_sales', 1));
    }
}
