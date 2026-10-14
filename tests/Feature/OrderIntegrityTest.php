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

    public function test_buyer_can_order_part_of_the_stock(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 5]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2]);

        $listing->refresh();
        $this->assertSame(3, $listing->quantity);
        $this->assertSame('available', $listing->status);
        $this->assertDatabaseHas('orders', ['listing_id' => $listing->id, 'quantity' => 2]);
    }

    public function test_cannot_order_more_than_the_stock(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 2]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 3])
            ->assertSessionHas('error');

        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(2, $listing->fresh()->quantity);
    }

    public function test_ordering_the_last_units_reserves_the_listing_and_cancelling_restores_them(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 3]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 3]);
        $this->assertSame('reserved', $listing->fresh()->status);
        $this->assertSame(0, $listing->fresh()->quantity);

        $order = $listing->orders()->first();
        $this->actingAs($buyer)->post("/orders/{$order->id}/cancel", ['reason' => 'Changed my mind']);

        $listing->refresh();
        $this->assertSame(3, $listing->quantity);
        $this->assertSame('available', $listing->status);
        $this->assertSame('Changed my mind', $order->fresh()->cancel_reason);
        $this->assertNotNull($order->fresh()->cancelled_at);
        $this->assertSame($buyer->id, $order->fresh()->cancelled_by);
    }

    public function test_listing_sells_out_only_when_every_unit_is_completed(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 2]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2]);
        $order = $listing->orders()->first();

        $this->actingAs($seller)->post("/orders/{$order->id}/confirm");
        $this->assertNotNull($order->fresh()->confirmed_at);
        $this->assertSame('reserved', $listing->fresh()->status);

        $this->actingAs($buyer)->post("/orders/{$order->id}/complete");
        $this->assertNotNull($order->fresh()->completed_at);
        $this->assertSame('sold', $listing->fresh()->status);
    }

    public function test_listing_with_open_orders_cannot_be_deleted(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order");

        $this->actingAs($seller)->delete("/listings/{$listing->id}")->assertSessionHas('error');
        $this->assertDatabaseHas('listings', ['id' => $listing->id]);
    }
}
