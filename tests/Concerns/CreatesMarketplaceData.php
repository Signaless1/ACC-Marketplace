<?php

namespace Tests\Concerns;

use App\Models\Category;
use App\Models\Listing;
use App\Models\Order;
use App\Models\User;

trait CreatesMarketplaceData
{
    protected function makeCategory(string $name = 'Electronics'): Category
    {
        return Category::query()->where('name', $name)->first()
            ?? tap(new Category(), function (Category $category) use ($name) {
                $category->forceFill([
                    'name' => $name,
                    'slug' => str()->slug($name),
                ])->save();
            });
    }

    protected function makeListing(User $seller, array $overrides = []): Listing
    {
        $title = $overrides['title'] ?? 'Scientific Calculator';

        return Listing::create(array_merge([
            'user_id' => $seller->id,
            'category_id' => $this->makeCategory()->id,
            'title' => $title,
            'slug' => str()->slug($title).'-'.uniqid(),
            'description' => 'Barely used.',
            'price' => 500,
            'type' => 'item',
            'status' => 'available',
        ], $overrides));
    }

    protected function makeOrder(Listing $listing, User $buyer, string $status = 'pending'): Order
    {
        return Order::create([
            'listing_id' => $listing->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $listing->user_id,
            'price' => $listing->price,
            'quantity' => 1,
            'status' => $status,
        ]);
    }

    protected function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }
}
