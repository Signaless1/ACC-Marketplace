<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class MarketplaceUpgradeTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function listingPayload(array $overrides = []): array
    {
        return array_merge([
            'category_id' => $this->makeCategory()->id,
            'title' => 'Scientific Calculator',
            'description' => 'Works perfectly, barely used.',
            'price' => 250,
            'quantity' => 3,
            'type' => 'item',
        ], $overrides);
    }

    public function test_listing_limits_are_enforced(): void
    {
        $user = User::factory()->create();

        $bad = [
            ['title' => 'ab'],
            ['title' => str_repeat('x', 101)],
            ['description' => 'short'],
            ['description' => str_repeat('x', 2001)],
            ['price' => 0],
            ['price' => 1000000],
            ['price' => 10.123],
            ['quantity' => 0],
            ['quantity' => 1000],
            ['quantity' => 1.5],
        ];

        foreach ($bad as $override) {
            $this->actingAs($user)
                ->post('/listings', $this->listingPayload($override))
                ->assertSessionHasErrors(array_key_first($override));
        }

        $this->assertDatabaseCount('listings', 0);

        $this->actingAs($user)
            ->post('/listings', $this->listingPayload())
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('listings', ['title' => 'Scientific Calculator', 'quantity' => 3]);
    }

    public function test_ordering_reserves_units_and_cancelling_returns_them(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['quantity' => 5]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2])
            ->assertSessionHasNoErrors();

        $listing->refresh();
        $this->assertSame(3, $listing->quantity);
        $this->assertSame('available', $listing->status);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 4])
            ->assertSessionHas('error');

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 3]);
        $this->assertSame('reserved', $listing->fresh()->status);

        $order = $buyer->buyerOrders()->first();
        $this->actingAs($buyer)->post("/orders/{$order->id}/cancel");

        $listing->refresh();
        $this->assertSame(2, $listing->quantity);
        $this->assertSame('available', $listing->status);
    }

    public function test_marketplace_cards_carry_product_ratings(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold']);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", [
            'rating' => 5,
            'product_rating' => 4,
        ])->assertSessionHas('success');

        $this->actingAs($buyer)->get('/marketplace?availability=all')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('listings.data.0.rating_count', 1)
                ->where('listings.data.0.rating_average', 4));
    }

    public function test_review_can_include_photos_and_seller_can_reply(): void
    {
        Storage::fake('public');

        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller, ['status' => 'sold']);
        $order = $this->makeOrder($listing, $buyer, 'completed');

        $this->actingAs($buyer)->post("/orders/{$order->id}/review", [
            'rating' => 5,
            'product_rating' => 5,
            'comment' => 'Great',
            'attachments' => [UploadedFile::fake()->image('proof.jpg')],
        ])->assertSessionHasNoErrors();

        $review = $order->review()->first();
        $this->assertSame(1, $review->attachments()->count());

        $this->actingAs($buyer)->post("/reviews/{$review->id}/reply", ['reply' => 'x thanks'])->assertForbidden();
        $this->actingAs($seller)->post("/reviews/{$review->id}/reply", ['reply' => 'Thank you!'])
            ->assertSessionHas('success');

        $this->assertSame('Thank you!', $review->fresh()->seller_reply);
    }

    public function test_listing_page_has_reviews_and_more_to_browse(): void
    {
        $seller = User::factory()->create();
        $viewer = User::factory()->create();
        $listing = $this->makeListing($seller);
        $this->makeListing($seller, ['title' => 'Another thing']);

        $this->actingAs($viewer)->get("/listings/{$listing->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Listings/Show')
                ->has('reviews')
                ->has('fromSeller', 1)
                ->has('similar')
                ->has('discover'));
    }

    public function test_message_with_attachment_and_polling(): void
    {
        Storage::fake('public');

        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");
        $conversation = $buyer->buyerConversations()->first();

        // Empty message is rejected.
        $this->actingAs($buyer)->postJson("/messages/{$conversation->id}", [])
            ->assertStatus(422);

        $response = $this->actingAs($buyer)->postJson("/messages/{$conversation->id}", [
            'body' => 'Is this still available?',
            'attachments' => [UploadedFile::fake()->image('photo.png')],
        ])->assertCreated();

        $messageId = $response->json('message.id');
        $this->assertSame('image', $response->json('message.attachments.0.kind'));

        // Disallowed file type.
        $this->actingAs($buyer)->postJson("/messages/{$conversation->id}", [
            'attachments' => [UploadedFile::fake()->create('virus.exe', 10)],
        ])->assertStatus(422);

        $this->actingAs($seller)->getJson('/messages/summary')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('latest.conversation_id', $conversation->id);

        $this->actingAs($seller)->getJson("/messages/{$conversation->id}/poll?after=0")
            ->assertOk()
            ->assertJsonPath('messages.0.id', $messageId);

        // Polling marked it read.
        $this->actingAs($seller)->getJson('/messages/summary')->assertJsonPath('unread_count', 0);
        $this->actingAs($buyer)->getJson("/messages/{$conversation->id}/poll?after={$messageId}")
            ->assertJsonPath('read_ids.0', $messageId);

        $this->actingAs(User::factory()->create())->getJson("/messages/{$conversation->id}/poll")
            ->assertForbidden();
    }

    public function test_conversation_listing_includes_images_for_the_chat(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);
        $listing->images()->create(['path' => 'listings/a.jpg', 'sort_order' => 0]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");
        $conversation = $buyer->buyerConversations()->first();

        $this->actingAs($buyer)->get("/messages/{$conversation->id}")
            ->assertInertia(fn ($page) => $page
                ->where('conversation.listing.images.0.path', 'listings/a.jpg'));
    }

    public function test_transaction_report_and_case_file(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $stranger = User::factory()->create();
        $admin = $this->makeAdmin();
        $listing = $this->makeListing($seller);
        $order = $this->makeOrder($listing, $buyer, 'confirmed');

        $this->actingAs($stranger)->post("/orders/{$order->id}/report", ['reason' => 'fraud'])->assertForbidden();
        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'because'])
            ->assertSessionHasErrors('reason');

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'non_delivery',
            'description' => 'Never showed up',
        ])->assertSessionHas('success');

        $report = Report::first();
        $this->assertSame($order->id, $report->order_id);
        $this->assertSame($seller->id, $report->reported_user_id);

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'fraud'])
            ->assertSessionHas('error');

        $this->actingAs($buyer)->get("/reports/{$report->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Show')
                ->where('order.id', $order->id)
                ->where('reportedUser.email', null));

        $this->actingAs($stranger)->get("/reports/{$report->id}")->assertForbidden();

        $this->actingAs($admin)->get("/reports/{$report->id}")
            ->assertInertia(fn ($page) => $page->where('reportedUser.email', $seller->email));

        $this->actingAs($admin)->post("/admin/reports/{$report->id}/escalate", [
            'escalated_to' => 'Student Affairs Office',
        ])->assertSessionHas('success');

        $this->assertSame('Student Affairs Office', $report->fresh()->escalated_to);
    }

    public function test_admin_removes_listing_with_reason_without_suspending_seller(): void
    {
        $admin = $this->makeAdmin();
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/hide", [])
            ->assertSessionHasErrors('reason');

        $this->actingAs($admin)->post("/admin/listings/{$listing->id}/hide", [
            'reason' => 'prohibited',
            'note' => 'No alcohol please.',
        ])->assertSessionHas('success');

        $listing->refresh();
        $this->assertNotNull($listing->hidden_at);
        $this->assertSame('prohibited', $listing->removed_reason);
        $this->assertFalse($seller->fresh()->isSuspended());
        $this->assertDatabaseHas('moderation_logs', ['listing_id' => $listing->id, 'action' => 'hidden']);

        $this->actingAs($seller)->get("/listings/{$listing->id}")
            ->assertInertia(fn ($page) => $page->where('listing.removed_reason', 'prohibited'));

        $this->actingAs($admin)->delete("/admin/listings/{$listing->id}", ['reason' => 'spam'])
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('listings', ['id' => $listing->id]);
        $this->assertDatabaseHas('moderation_logs', ['action' => 'deleted', 'reason' => 'spam']);
    }
}
