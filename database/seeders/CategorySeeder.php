<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Electronics',
                'slug' => 'electronics',
                'description' => 'Phones, laptops, accessories, gadgets, and other electronic items.',
            ],
            [
                'name' => 'Clothing',
                'slug' => 'clothing',
                'description' => 'Clothes, shoes, bags, uniforms, and fashion accessories.',
            ],
            [
                'name' => 'School Supplies',
                'slug' => 'school-supplies',
                'description' => 'Books, notebooks, calculators, stationery, and other school materials.',
            ],
            [
                'name' => 'Food & Drinks',
                'slug' => 'food-drinks',
                'description' => 'Food, snacks, drinks, and other consumable products.',
            ],
            [
                'name' => 'Services',
                'slug' => 'services',
                'description' => 'Student-provided services such as tutoring, design, editing, and other skills.',
            ],
            [
                'name' => 'Home & Living',
                'slug' => 'home-living',
                'description' => 'Furniture, decorations, appliances, and other household items.',
            ],
            [
                'name' => 'Others',
                'slug' => 'others',
                'description' => 'Items and services that do not fit into another category.',
            ],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}