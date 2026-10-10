<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class OrderIntegrityTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_buyer_can_order_and_listing_becomes_reserved(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order")
            ->assertRedirect('/orders');

        $this->assertDatabaseHas('orders', [
            'listing_id' => $listing->id,
            'buyer_id' => $buyer->id,
            'status' => 'pending',
            'price' => 500,
        ]);
        $this->assertSame('reserved', $listing->fresh()->status);
    }

    public function test_seller_cannot_order_own_listing(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($seller)->post("/listings/{$listing->id}/order")
            ->assertSessionHas('error');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_reserved_listing_cannot_be_ordered_by_second_buyer(): void
    {
        $seller = User::factory()->create();
        $first = User::factory()->create();
        $second = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($first)->post("/listings/{$listing->id}/order");
        $this->actingAs($second)->post("/listings/{$listing->id}/order")
            ->assertSessionHas('error');

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_only_seller_can_confirm(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'reserved']);
        $order = $this->makeOrder($listing, $buyer);

        $this->actingAs($buyer)->post("/orders/{$order->id}/confirm")->assertForbidden();
        $this->actingAs($seller)->post("/orders/{$order->id}/confirm");

        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_stranger_cannot_cancel_or_complete(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $stranger = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'reserved']);
        $order = $this->makeOrder($listing, $buyer, 'confirmed');

        $this->actingAs($stranger)->post("/orders/{$order->id}/cancel")->assertForbidden();
        $this->actingAs($stranger)->post("/orders/{$order->id}/complete")->assertForbidden();
    }

    public function test_pending_order_cannot_be_completed_directly(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'reserved']);
        $order = $this->makeOrder($listing, $buyer);

        $this->actingAs($buyer)->post("/orders/{$order->id}/complete")
            ->assertSessionHas('error');

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_completing_marks_listing_sold_and_blocks_cancellation(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'reserved']);
        $order = $this->makeOrder($listing, $buyer, 'confirmed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/complete");
        $this->assertSame('sold', $listing->fresh()->status);

        $this->actingAs($buyer)->post("/orders/{$order->id}/cancel")
            ->assertSessionHas('error');
        $this->assertSame('completed', $order->fresh()->status);
        $this->assertSame('sold', $listing->fresh()->status);
    }

    public function test_cancelling_makes_listing_available_again(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'reserved']);
        $order = $this->makeOrder($listing, $buyer);

        $this->actingAs($buyer)->post("/orders/{$order->id}/cancel");

        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame('available', $listing->fresh()->status);
    }
}
