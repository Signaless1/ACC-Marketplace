<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class TransactionReportTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function transaction(): array
    {
        Storage::fake('local');

        $seller = User::factory()->create(['name' => 'Sally Seller', 'email' => 'sally@example.com']);
        $buyer = User::factory()->create(['name' => 'Ben Buyer', 'email' => 'ben@example.com']);
        $listing = $this->makeListing($seller, ['title' => 'Graphing calculator', 'price' => 400, 'quantity' => 2]);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/order", ['quantity' => 2]);
        $order = $listing->orders()->first();

        $this->actingAs($buyer)->post("/orders/{$order->id}/message");
        $conversation = Conversation::first();
        $this->actingAs($buyer)->post("/messages/{$conversation->id}", ['body' => 'Meet at the library at 3pm?']);
        $this->actingAs($seller)->post("/messages/{$conversation->id}", [
            'body' => 'Sure. I will bring it.',
            'attachments' => [UploadedFile::fake()->create('item.jpg', 50, 'image/jpeg')],
        ]);
        $this->actingAs($seller)->post("/orders/{$order->id}/confirm");

        return [$seller, $buyer, $order->fresh()];
    }

    public function test_a_party_sees_the_compiled_transaction(): void
    {
        [$seller, $buyer, $order] = $this->transaction();

        $this->actingAs($buyer)->get("/orders/{$order->id}/report")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Orders/TransactionReport')
                ->where('viewerRole', 'buyer')
                ->where('summary.order.reference', $order->reference)
                ->where('summary.order.quantity', 2)
                ->where('summary.order.total', '800.00')
                ->where('summary.listing.title', 'Graphing calculator')
                ->where('summary.buyer.email', 'ben@example.com')
                ->where('summary.seller.name', 'Sally Seller')
                ->has('summary.messages', 2)
                ->where('summary.messages.0.role', 'buyer')
                ->where('summary.messages.1.attachments.0.name', 'item.jpg')
                // placed + confirmed
                ->has('summary.timeline', 2)
                ->where('canSubmit', true));

        $this->actingAs($seller)->get("/orders/{$order->id}/report")
            ->assertInertia(fn ($page) => $page->where('viewerRole', 'seller'));
    }

    public function test_strangers_cannot_see_a_transaction_but_admins_can(): void
    {
        [, , $order] = $this->transaction();

        $this->actingAs(User::factory()->create())->get("/orders/{$order->id}/report")->assertForbidden();
        $this->actingAs(User::factory()->create())->post("/orders/{$order->id}/report", [
            'reason' => 'fraud',
            'description' => str_repeat('x', 30),
        ])->assertForbidden();

        $this->actingAs($this->makeAdmin())->get("/orders/{$order->id}/report")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('viewerRole', 'admin')->where('canSubmit', false));
    }

    public function test_a_party_can_report_the_transaction_to_the_admins(): void
    {
        [$seller, $buyer, $order] = $this->transaction();

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'no_show',
            'description' => 'The seller never came to the library at the agreed time.',
        ])->assertSessionHas('success');

        $report = Report::first();
        $this->assertSame($order->id, $report->order_id);
        $this->assertSame($order->listing_id, $report->listing_id);
        $this->assertSame($buyer->id, $report->reporter_id);
        // The report is about the OTHER party.
        $this->assertSame($seller->id, $report->reported_user_id);
        $this->assertSame('pending', $report->status);

        // The compiled document now lists it, and a duplicate is blocked.
        $this->actingAs($buyer)->get("/orders/{$order->id}/report")
            ->assertInertia(fn ($page) => $page
                ->has('summary.reports', 1)
                ->where('canSubmit', false)
                ->where('openReport.reason', 'no_show'));

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'fraud',
            'description' => str_repeat('y', 30),
        ])->assertSessionHas('error');
        $this->assertSame(1, Report::count());

        // The other side may file their own account.
        $this->actingAs($seller)->post("/orders/{$order->id}/report", [
            'reason' => 'other',
            'description' => 'The buyer did not answer messages for two days.',
        ])->assertSessionHas('success');
        $this->assertSame(2, Report::count());
        $this->assertSame($buyer->id, Report::latest('id')->first()->reported_user_id);
    }

    public function test_transaction_report_validation(): void
    {
        [, $buyer, $order] = $this->transaction();

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'fraud', 'description' => 'too short'])
            ->assertSessionHasErrors('description');
        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'because', 'description' => str_repeat('z', 30)])
            ->assertSessionHasErrors('reason');
        $this->actingAs($buyer)->post("/orders/{$order->id}/report", ['reason' => 'fraud'])
            ->assertSessionHasErrors('description');

        $this->assertSame(0, Report::count());
    }

    public function test_admins_cannot_file_transaction_reports_and_see_them_in_the_queue(): void
    {
        [, $buyer, $order] = $this->transaction();
        $admin = $this->makeAdmin();

        $this->actingAs($admin)->post("/orders/{$order->id}/report", [
            'reason' => 'fraud',
            'description' => str_repeat('a', 30),
        ])->assertSessionHas('error');

        $this->actingAs($buyer)->post("/orders/{$order->id}/report", [
            'reason' => 'not_as_described',
            'description' => 'The calculator does not turn on at all.',
        ]);

        $this->actingAs($admin)->get('/admin/reports')
            ->assertInertia(fn ($page) => $page
                ->has('reports.data', 1)
                ->where('reports.data.0.order.id', $order->id)
                ->where('reports.data.0.reason', 'not_as_described')
                ->where('reasons.not_as_described', 'Not as described'));

        $this->actingAs($admin)->get('/admin/orders?status=reported')
            ->assertInertia(fn ($page) => $page->has('orders.data', 1));

        $this->actingAs($admin)->get('/admin/orders?q=' . $order->reference)
            ->assertInertia(fn ($page) => $page->has('orders.data', 1));
    }
}
