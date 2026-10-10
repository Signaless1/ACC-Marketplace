<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class DiscoveryTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    public function test_search_filters_by_title(): void
    {
        $seller = User::factory()->create();
        $this->makeListing($seller, ['title' => 'Casio Calculator']);
        $this->makeListing($seller, ['title' => 'Laptop Stand']);

        $this->get('/marketplace?q=calculator')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('listings.data', 1)
                ->where('listings.data.0.title', 'Casio Calculator'));
    }

    public function test_price_range_type_and_sort_filters(): void
    {
        $seller = User::factory()->create();
        $this->makeListing($seller, ['title' => 'Cheap', 'price' => 100]);
        $this->makeListing($seller, ['title' => 'Mid', 'price' => 500, 'type' => 'service']);
        $this->makeListing($seller, ['title' => 'Pricey', 'price' => 900]);

        $this->get('/marketplace?min_price=200&max_price=950&sort=price_desc')
            ->assertInertia(fn ($page) => $page
                ->has('listings.data', 2)
                ->where('listings.data.0.title', 'Pricey'));

        $this->get('/marketplace?type=service')
            ->assertInertia(fn ($page) => $page
                ->has('listings.data', 1)
                ->where('listings.data.0.title', 'Mid'));
    }

    public function test_availability_filter(): void
    {
        $seller = User::factory()->create();
        $this->makeListing($seller, ['title' => 'Free']);
        $this->makeListing($seller, ['title' => 'Taken', 'status' => 'sold']);

        $this->get('/marketplace')->assertInertia(fn ($page) => $page->has('listings.data', 1));
        $this->get('/marketplace?availability=all')->assertInertia(fn ($page) => $page->has('listings.data', 2));
    }

    public function test_hidden_and_suspended_seller_listings_are_not_shown(): void
    {
        $seller = User::factory()->create();
        $suspended = User::factory()->create(['suspended_at' => now()]);
        $this->makeListing($seller, ['title' => 'Visible']);
        $this->makeListing($seller, ['title' => 'Hidden', 'hidden_at' => now()]);
        $this->makeListing($suspended, ['title' => 'From suspended']);

        $this->get('/marketplace')
            ->assertInertia(fn ($page) => $page
                ->has('listings.data', 1)
                ->where('listings.data.0.title', 'Visible'));
    }

    public function test_favorites_can_be_toggled_and_listed(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($buyer)->post("/listings/{$listing->id}/favorite");
        $this->assertDatabaseHas('favorites', ['user_id' => $buyer->id, 'listing_id' => $listing->id]);

        $this->actingAs($buyer)->get('/favorites')
            ->assertInertia(fn ($page) => $page->has('listings.data', 1));

        $this->actingAs($buyer)->post("/listings/{$listing->id}/favorite");
        $this->assertDatabaseCount('favorites', 0);
    }

    public function test_cannot_favorite_own_listing(): void
    {
        $seller = User::factory()->create();
        $listing = $this->makeListing($seller);

        $this->actingAs($seller)->post("/listings/{$listing->id}/favorite")
            ->assertSessionHas('error');

        $this->assertDatabaseCount('favorites', 0);
    }
}
