<?php

namespace Tests\Feature;

use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesMarketplaceData;
use Tests\TestCase;

class ListingValidationTest extends TestCase
{
    use CreatesMarketplaceData;
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'category_id' => $this->makeCategory()->id,
            'title' => 'Casio scientific calculator',
            'description' => 'Barely used, works perfectly. Meet at the library.',
            'price' => '350.50',
            'quantity' => 2,
            'type' => 'item',
            'condition' => 'Good',
        ], $overrides);
    }

    private function png(string $name = 'a.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==')
        );
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_valid_listing_is_created_with_quantity(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/listings', $this->payload(['images' => [$this->png()]]))
            ->assertSessionHasNoErrors();

        $listing = Listing::first();
        $this->assertSame(2, $listing->quantity);
        $this->assertSame('350.50', $listing->price);
        $this->assertSame('available', $listing->status);
        $this->assertCount(1, $listing->images);
    }

    public function test_text_limits(): void
    {
        $user = User::factory()->create();

        foreach ([
            ['title' => str_repeat('a', 101)],
            ['title' => 'ab'],
            ['title' => '   '],
            ['description' => str_repeat('a', 3001)],
            ['description' => 'short'],
        ] as $bad) {
            $field = array_key_first($bad);
            $this->actingAs($user)->post('/listings', $this->payload($bad))
                ->assertSessionHasErrors($field);
        }

        $this->assertSame(0, Listing::count());
    }

    public function test_number_limits(): void
    {
        $user = User::factory()->create();

        $cases = [
            'price' => ['5000000000000000000000', '1000000', '-1', '12.345', 'abc', '1e3'],
            'quantity' => [0, -3, 1000, '1.5', 'many'],
        ];

        foreach ($cases as $field => $values) {
            foreach ($values as $value) {
                $this->actingAs($user)->post('/listings', $this->payload([$field => $value]))
                    ->assertSessionHasErrors($field);
            }
        }

        // The edges are allowed.
        $this->actingAs($user)->post('/listings', $this->payload(['price' => '999999.99', 'quantity' => 999]))
            ->assertSessionHasNoErrors();
        $this->actingAs($user)->post('/listings', $this->payload(['price' => '0', 'quantity' => 1]))
            ->assertSessionHasNoErrors();

        $this->assertSame(2, Listing::count());
    }

    public function test_type_condition_category_and_images_are_validated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/listings', $this->payload(['type' => 'rental']))->assertSessionHasErrors('type');
        $this->actingAs($user)->post('/listings', $this->payload(['condition' => 'Haunted']))->assertSessionHasErrors('condition');
        $this->actingAs($user)->post('/listings', $this->payload(['category_id' => 9999]))->assertSessionHasErrors('category_id');

        $this->actingAs($user)->post('/listings', $this->payload([
            'images' => array_map(fn ($i) => $this->png("p{$i}.png"), range(1, 9)),
        ]))->assertSessionHasErrors('images');

        $this->actingAs($user)->post('/listings', $this->payload([
            'images' => [UploadedFile::fake()->create('big.jpg', 6000, 'image/jpeg')],
        ]))->assertSessionHasErrors('images.0');

        $this->actingAs($user)->post('/listings', $this->payload([
            'images' => [UploadedFile::fake()->create('script.php', 1, 'application/x-php')],
        ]))->assertSessionHasErrors('images.0');
    }

    public function test_service_listings_drop_the_condition(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/listings', $this->payload(['type' => 'service', 'condition' => 'Good']));

        $this->assertNull(Listing::first()->condition);
    }

    public function test_editing_stock_updates_availability(): void
    {
        $user = User::factory()->create();
        $listing = $this->makeListing($user, ['quantity' => 3]);

        // Zero stock and no open orders: sold out.
        $this->actingAs($user)->put("/listings/{$listing->id}", $this->payload(['quantity' => 0]))
            ->assertSessionHasNoErrors();
        $this->assertSame('sold', $listing->fresh()->status);

        // Restocking relists it.
        $this->actingAs($user)->put("/listings/{$listing->id}", $this->payload(['quantity' => 4]));
        $this->assertSame('available', $listing->fresh()->status);
        $this->assertSame(4, $listing->fresh()->quantity);
    }

    public function test_edit_can_remove_and_add_photos_within_the_limit(): void
    {
        $user = User::factory()->create();
        $listing = $this->makeListing($user);
        $old = $listing->images()->create(['path' => 'listings/old.png', 'sort_order' => 0]);
        Storage::disk('public')->put('listings/old.png', 'x');

        $this->actingAs($user)->put("/listings/{$listing->id}", $this->payload([
            'remove_images' => [$old->id],
            'images' => [$this->png('new.png')],
        ]))->assertSessionHasNoErrors();

        $listing->refresh();
        $this->assertCount(1, $listing->images);
        $this->assertNotSame('listings/old.png', $listing->images->first()->path);
        Storage::disk('public')->assertMissing('listings/old.png');
    }

    public function test_another_user_cannot_update_a_listing(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $listing = $this->makeListing($owner);

        $this->actingAs($other)->put("/listings/{$listing->id}", $this->payload(['title' => 'Hacked title']))
            ->assertForbidden();

        $this->assertNotSame('Hacked title', $listing->fresh()->title);
    }
}
