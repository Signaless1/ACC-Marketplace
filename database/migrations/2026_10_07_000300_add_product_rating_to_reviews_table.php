<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            // `rating` stays the seller rating. `product_rating` rates the item
            // itself; old reviews keep NULL and simply don't count towards it.
            if (! Schema::hasColumn('reviews', 'product_rating')) {
                $table->unsignedTinyInteger('product_rating')->nullable();
            }
        });

        // The index is created separately so a repeated run never fails on it.
        $indexes = collect(Schema::getIndexes('reviews'))->pluck('name');

        if (! $indexes->contains('reviews_listing_id_index')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->index('listing_id');
            });
        }
    }

    public function down(): void
    {
        $indexes = collect(Schema::getIndexes('reviews'))->pluck('name');

        Schema::table('reviews', function (Blueprint $table) use ($indexes) {
            if ($indexes->contains('reviews_listing_id_index')) {
                $table->dropIndex(['listing_id']);
            }

            if (Schema::hasColumn('reviews', 'product_rating')) {
                $table->dropColumn('product_rating');
            }
        });
    }
};
