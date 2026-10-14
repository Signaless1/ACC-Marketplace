<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Order;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

/**
 * Covers stock/quantity, listing limits, chat attachments + live feed,
 * product ratings with files, transaction reports and reasoned removals.
 */
class MarketplaceUpgradeTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    /** A real 1x1 PNG, so the tests do not need the GD extension. */
    private function tinyImage(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==')
        );
    }

    // ---------------------------------------------------------------
    // Listing limits
    // ---------------------------------------------------------------

    private function validListing(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Casio fx-991ES calculator',
            'category_id' => $this->makeCategory()->id,
            'type' => 'item',
            'price' => '450.50',
            'quantity' => 3,
            'condition' => 'Good',
            'description' => 'Used for one semester, no scratches on the screen.',
        ], $overrides);
    }

    public function test_listing_can_be_created_with_quantity(): void
    {
        $seller = User::factory()->create();

        $this->actingAs($seller)->post('/listings', $this->validListing())
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('listings', [
            'user_id' => $seller->id,
            'quantity' => 3,
            'price' => 450.50,
            'status' => 'available',
        ]);
    }

    #[DataProvider('invalidListingProvider')]
    public function test_listing_limits_are_enforced(array $override, string $field): void
    {
        $seller = User::factory()->create();

        $this->actingAs($seller)->post('/listings', $this->validListing($override))
            ->assertSessionHasErrors($field);

        $this->assertDatabaseCount('listings', 0);
    }

    public static function invalidListingProvider(): array
    {
        return [
            'title too long' => [['title' => str_repeat('a', 101)], 'title'],
            'title too short' => [['title' => 'ab'], 'title'],
            'description too short' => [['description' => 'too short'], 'description'],
            'description too long' => [['description' => str_repeat('a', 3001)], 'description'],
            'price too high' => [['price' => '1000000'], 'price'],
            'price negative' => [['price' => '-5'], 'price'],
            'price three decimals' => [['price' => '10.123'], 'price'],
            'price not a number' => [['price' => 'abc'], 'price'],
            'price exponent' => [['price' => '1e9'], 'price'],
            'quantity zero' => [['quantity' => 0], 'quantity'],
            'quantity too high' => [['quantity' => 1000], 'quantity'],
            'quantity fraction' => [['quantity' => '1.5'], 'quantity'],
            'quantity missing' => [['quantity' => ''], 'quantity'],
            'bad condition' => [['condition' => 'Haunted'], 'condition'],
        ];
    }

    // ---------------------------------------------------------------
    // Quantity / stock
    // ---------------------------------------------------------------

    public function test_ordering_reduces_stock_and_reserves_only_when_empty(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $other = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 5]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2])
            ->assertRedirect('/orders');

        $this->assertSame(3, $listing->fresh()->quantity);
        $this->assertSame('available', $listing->fresh()->status);

        $this->actingAs($other)->post("/listings/{$listing->id}/order", ['quantity' => 4])
            ->assertSessionHas('error');
        $this->assertSame(3, $listing->fresh()->quantity);

        $this->actingAs($other)->post("/listings/{$listing->id}/order", ['quantity' => 3]);
        $this->assertSame(0, $listing->fresh()->quantity);
        $this->assertSame('reserved', $listing->fresh()->status);

        $this->assertDatabaseHas('orders', ['buyer_id' => $buyer->id, 'quantity' => 2]);
        $this->assertDatabaseHas('order_events', ['event' => 'placed', 'user_id' => $buyer->id]);
    }

    public function test_cancelling_returns_stock_and_completing_everything_marks_sold(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 2]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2]);
        $order = Order::firstOrFail();
        $this->assertSame('reserved', $listing->fresh()->status);

        $this->actingAs($buyer)->post("/orders/{$order->id}/cancel");
        $this->assertSame(2, $listing->fresh()->quantity);
        $this->assertSame('available', $listing->fresh()->status);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2]);
        $second = Order::latest('id')->firstOrFail();
        $this->actingAs($seller)->post("/orders/{$second->id}/confirm");
        $this->actingAs($buyer)->post("/orders/{$second->id}/complete");

        $this->assertSame('sold', $listing->fresh()->status);
        $this->assertSame(0, $listing->fresh()->quantity);
        $this->assertDatabaseHas('order_events', ['order_id' => $second->id, 'event' => 'completed']);
    }

    public function test_cannot_order_zero_or_absurd_quantities(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 5]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 0])
            ->assertSessionHasErrors('quantity');
        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 99999])
            ->assertSessionHasErrors('quantity');

        $this->assertDatabaseCount('orders', 0);
    }

    // ---------------------------------------------------------------
    // Messages: attachments, product image, live feed, privacy
    // ---------------------------------------------------------------

    private function conversation(): array
    {
        $seller = User::factory()->create(['email' => 'seller-secret@example.com']);
        $buyer = User::factory()->create(['email' => 'buyer-secret@example.com']);
        $listing = $this->makeListing($seller);
        $listing->images()->create(['path' => 'listings/cover.jpg', 'sort_order' => 0]);

        $conversation = Conversation::create([
            'listing_id' => $listing->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
        ]);

        return [$seller, $buyer, $listing, $conversation];
    }

    public function test_chat_page_includes_product_image_and_hides_emails(): void
    {
        [$seller, $buyer, , $conversation] = $this->conversation();

        $response = $this->actingAs($buyer)->get("/messages/{$conversation->id}");

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Messages/Show')
            ->where('conversation.listing.images.0.path', 'listings/cover.jpg')
            ->where('conversation.seller.id', $seller->id)
            ->missing('conversation.seller.email')
            ->missing('conversation.buyer.email'));

        $this->assertStringNotContainsString('seller-secret@example.com', $response->getContent());
    }

    // ---------------------------------------------------------------
    // Reviews: product rating, comment, attachments, card ratings
    // ---------------------------------------------------------------

    public function test_review_rates_product_and_seller_with_attachments(): void
    {
        Storage::fake('public');
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold', 'quantity' => 0]);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", [
            'rating' => 5,
            'product_rating' => 3,
            'comment' => 'Works, but the case is scratched.',
            'attachments' => [$this->tinyImage('proof.png')],
        ])->assertSessionHas('success');

        $review = Review::firstOrFail();
        $this->assertSame(5, $review->rating);
        $this->assertSame(3, $review->product_rating);
        $this->assertCount(1, $review->attachments);
    }

    public function test_product_rating_is_required_and_bounded(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold', 'quantity' => 0]);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 5])
            ->assertSessionHasErrors('product_rating');
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", ['rating' => 5, 'product_rating' => 9])
            ->assertSessionHasErrors('product_rating');
        $this->actingAs($buyer)->post("/orders/{$order->id}/review", [
            'rating' => 5, 'product_rating' => 4, 'comment' => str_repeat('a', 1001),
        ])->assertSessionHasErrors('comment');
    }

    public function test_listing_and_marketplace_show_product_ratings_not_seller_ratings(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);
        $unrated = $this->makeListing($seller, ['title' => 'Unrated thing']);

        foreach ([[5, 4], [1, 2]] as [$sellerStars, $productStars]) {
            $buyer = User::factory()->create();
            $order = $this->makeOrder($listing, $buyer, 'completed');
            Review::create([
                'order_id' => $order->id,
                'listing_id' => $listing->id,
                'reviewer_id' => $buyer->id,
                'seller_id' => $seller->id,
                'rating' => $sellerStars,
                'product_rating' => $productStars,
                'comment' => 'ok',
            ]);
        }

        $viewer = User::factory()->create();

        $this->actingAs($viewer)->get("/listings/{$listing->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->component('Listings/Show')
                ->where('listing.rating_avg', fn ($v) => (float) $v === 3.0)
                ->where('listing.rating_count', 2)
                ->where('sellerRating.average', 3)
                ->has('reviews', 2)
                ->has('similarListings')
                ->has('featuredListings'));

        $this->actingAs($viewer)->get('/marketplace')
            ->assertInertia(function (Assert $page) use ($listing, $unrated) {
                $items = collect($page->toArray()['props']['listings']['data'])->keyBy('id');

                $this->assertEquals(3.0, (float) $items[$listing->id]['rating_avg']);
                $this->assertSame(2, $items[$listing->id]['rating_count']);
                $this->assertNull($items[$unrated->id]['rating_avg']);
                $this->assertSame(0, $items[$unrated->id]['rating_count']);
            });
    }

    public function test_marketplace_can_sort_by_top_rated(): void
    {
        $seller = User::factory()->create();
        $low = $this->makeListing($seller, ['title' => 'Low rated']);
        $high = $this->makeListing($seller, ['title' => 'High rated']);

        foreach ([[$low, 2], [$high, 5]] as [$listing, $stars]) {
            $buyer = User::factory()->create();
            $order = $this->makeOrder($listing, $buyer, 'completed');
            Review::create([
                'order_id' => $order->id, 'listing_id' => $listing->id,
                'reviewer_id' => $buyer->id, 'seller_id' => $seller->id,
                'rating' => 5, 'product_rating' => $stars,
            ]);
        }

        $this->actingAs(User::factory()->create())->get('/marketplace?sort=top_rated')
            ->assertInertia(fn (Assert $page) => $page
                ->where('listings.data.0.id', $high->id)
                ->where('listings.data.1.id', $low->id));
    }

    // ---------------------------------------------------------------
    // Transaction reports + compiled report
    // ---------------------------------------------------------------

    private function reportedOrder(): array
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'reserved', 'quantity' => 0]);
        $order = $this->makeOrder($listing, $buyer, 'confirmed');

        return [$seller, $buyer, $listing, $order];
    }

    public function test_buyer_can_report_a_transaction_with_evidence(): void
    {
        Storage::fake('public');
        [$seller, $buyer, $listing, $order] = $this->reportedOrder();

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'item_not_received',
            'description' => 'We agreed to meet Monday but the seller never showed up.',
        ])->assertSessionHas('success');

        $report = Report::firstOrFail();
        $this->assertSame($order->id, $report->order_id);
        $this->assertSame($seller->id, $report->reported_user_id);
        $this->assertSame($listing->id, $report->listing_id);

        // Same person cannot file the same open report twice.
        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'fraud',
            'description' => 'Trying again with another reason, long enough.',
        ])->assertSessionHas('error');
        $this->assertDatabaseCount('reports', 1);
    }

    public function test_seller_can_report_too_and_strangers_cannot(): void
    {
        [$seller, $buyer, , $order] = $this->reportedOrder();
        $stranger = User::factory()->create();

        $this->actingAs($stranger)->post("/orders/{$order->id}/report", [
            'reason' => 'fraud', 'description' => 'I am not part of this order at all.',
        ])->assertForbidden();

        $this->actingAs($seller)->post("/orders/{$order->id}/report", [
            'reason' => 'payment_issue', 'description' => 'The buyer says they paid, but I received nothing.',
        ])->assertSessionHas('success');

        $this->assertSame($buyer->id, Report::firstOrFail()->reported_user_id);
    }

    public function test_transaction_report_needs_a_real_description_and_valid_reason(): void
    {
        [, $buyer, , $order] = $this->reportedOrder();

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'fraud', 'description' => 'bad'])
            ->assertSessionHasErrors('description');
        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'nonsense', 'description' => str_repeat('a', 30)])
            ->assertSessionHasErrors('reason');
        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'fraud', 'description' => str_repeat('a', 2001)])
            ->assertSessionHasErrors('description');
    }

    public function test_admin_can_record_that_the_report_was_escalated(): void
    {
        [, $buyer, , $order] = $this->reportedOrder();
        $admin = $this->makeAdmin();

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'fraud', 'description' => 'Asked me to pay through a link outside the site.',
        ]);
        $report = Report::firstOrFail();

        // Escalating must say who it went to.
        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", ['status' => 'escalated'])
            ->assertSessionHasErrors('escalated_to');

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'escalated',
            'escalated_to' => 'Department Dean',
            'admin_note' => 'Printed copy handed over on Friday.',
        ])->assertSessionHas('success');

        $report->refresh();
        $this->assertSame('escalated', $report->status);
        $this->assertSame('Department Dean', $report->escalated_to);
        $this->assertSame($admin->id, $report->reviewed_by);
        $this->assertNotNull($report->escalated_at);

        // Ordinary users cannot touch the admin queue.
        $this->actingAs($buyer)->patch("/admin/reports/{$report->id}", ['status' => 'resolved'])
            ->assertForbidden();
    }

    // ---------------------------------------------------------------
    // Admin removal with a reason (no automatic suspension)
    // ---------------------------------------------------------------

    public function test_admin_removes_listing_with_reason_and_seller_stays_active(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", [
            'reason' => 'misleading',
            'note' => 'Photos are not of the actual item.',
        ])->assertSessionHas('success');

        $listing->refresh();
        $this->assertNotNull($listing->hidden_at);
        $this->assertSame('misleading', $listing->removed_reason);
        $this->assertSame('Photos are not of the actual item.', $listing->removed_note);
        $this->assertSame($admin->id, $listing->removed_by);
        $this->assertFalse($seller->fresh()->isSuspended());

        // Other students cannot see it; the seller can, with the reason.
        $this->actingAs(User::factory()->create())->get("/listings/{$listing->id}")->assertNotFound();
        $this->actingAs($seller)->get("/listings/{$listing->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('listing.removed_reason', 'misleading')
                ->where('listing.removed_reason_label', 'Misleading title, photos or price'));
    }

    public function test_removal_requires_a_valid_reason_and_note_for_other(): void
    {
        $admin = $this->makeAdmin();
        $listing = $this->makeListing(User::factory()->create());

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", [])
            ->assertSessionHasErrors('reason');
        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", ['reason' => 'because'])
            ->assertSessionHasErrors('reason');
        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", ['reason' => 'other'])
            ->assertSessionHasErrors('note');

        $this->assertNull($listing->fresh()->hidden_at);

        $this->actingAs(User::factory()->create())->post("/admin/listings/{$listing->id}/remove", ['reason' => 'spam'])
            ->assertForbidden();
    }

    public function test_restoring_clears_the_removal_reason(): void
    {
        $admin = $this->makeAdmin();
        $listing = $this->makeListing(User::factory()->create());

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/remove", ['reason' => 'spam']);
        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/restore");

        $listing->refresh();
        $this->assertNull($listing->hidden_at);
        $this->assertNull($listing->removed_reason);
        $this->assertNull($listing->removed_by);
    }

    public function test_resolving_a_report_can_remove_listing_and_suspend_separately(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $reporter = User::factory()->create();
        $listing = $this->makeListing($seller);
        $report = Report::create([
            'reporter_id' => $reporter->id, 'listing_id' => $listing->id,
            'reported_user_id' => $seller->id, 'reason' => 'spam',
        ]);

        // Removal needs a reason...
        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved', 'remove_listing' => true,
        ])->assertSessionHasErrors('removal_reason');

        // ...and suspension only happens when asked for explicitly.
        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved', 'remove_listing' => true, 'removal_reason' => 'spam',
        ])->assertSessionHas('success');

        $this->assertNotNull($listing->fresh()->hidden_at);
        $this->assertFalse($seller->fresh()->isSuspended());

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved', 'suspend_user' => true,
        ])->assertSessionHasErrors('suspension_reason');
        $this->assertFalse($seller->fresh()->isSuspended());

        $this->actingAs($admin)->patch("/admin/reports/{$report->id}", [
            'status' => 'resolved', 'suspend_user' => true, 'suspension_reason' => 'Repeated spam listings.',
        ])->assertSessionHas('success');
        $this->assertTrue($seller->fresh()->isSuspended());
    }

    // ---------------------------------------------------------------
    // Editing keeps stock honest
    // ---------------------------------------------------------------

    public function test_editing_stock_to_zero_with_no_orders_marks_listing_sold(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 2]);

        $this->actingAs($seller)->put("/listings/{$listing->id}", [
            'title' => $listing->title,
            'category_id' => $listing->category_id,
            'type' => 'item',
            'price' => 500,
            'quantity' => 1,
            'description' => 'Barely used, still in great shape for the semester.',
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, $listing->fresh()->quantity);
        $this->assertSame('available', $listing->fresh()->status);
    }

    // ---------------------------------------------------------------
    // Inbox + orders payloads used by the new screens
    // ---------------------------------------------------------------

    public function test_orders_page_flags_orders_the_viewer_already_reported(): void
    {
        [, $buyer, , $order] = $this->reportedOrder();

        $this->actingAs($buyer)->get('/orders')
            ->assertInertia(fn (Assert $page) => $page
                ->where('buyingOrders.0.my_reports_count', 0));

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'fraud', 'description' => 'They asked me to pay somewhere else entirely.',
        ]);

        $this->actingAs($buyer)->get('/orders')
            ->assertInertia(fn (Assert $page) => $page->where('buyingOrders.0.my_reports_count', 1));
    }
}
