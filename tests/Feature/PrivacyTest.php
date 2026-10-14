<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class PrivacyTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_listing_page_never_exposes_the_sellers_email(): void
    {
        $seller = User::factory()->create(['email' => 'secret-seller@example.com']);
        $viewer = User::factory()->create();
        $listing = $this->makeListing($seller);

        $response = $this->actingAs($viewer)->get("/listings/{$listing->id}")->assertOk();

        $this->assertStringNotContainsString('secret-seller@example.com', $response->getContent());
    }

    public function test_orders_page_never_exposes_the_other_partys_email(): void
    {
        $seller = User::factory()->create(['email' => 'secret-seller@example.com']);
        $buyer = User::factory()->create(['email' => 'secret-buyer@example.com']);
        $listing = $this->makeListing($seller);
        $this->makeOrder($listing, $buyer);

        $asBuyer = $this->actingAs($buyer)->get('/orders')->assertOk()->getContent();
        $this->assertStringNotContainsString('secret-seller@example.com', $asBuyer);

        $asSeller = $this->actingAs($seller)->get('/orders')->assertOk()->getContent();
        $this->assertStringNotContainsString('secret-buyer@example.com', $asSeller);
    }

    public function test_chat_page_never_exposes_the_other_partys_email(): void
    {
        $seller = User::factory()->create(['email' => 'secret-seller@example.com']);
        $buyer = User::factory()->create(['email' => 'secret-buyer@example.com']);
        $listing = $this->makeListing($seller);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/message");
        $conversation = \App\Models\Conversation::first();

        $content = $this->actingAs($buyer)->get("/messages/{$conversation->id}")->assertOk()->getContent();
        $this->assertStringNotContainsString('secret-seller@example.com', $content);
    }
}
