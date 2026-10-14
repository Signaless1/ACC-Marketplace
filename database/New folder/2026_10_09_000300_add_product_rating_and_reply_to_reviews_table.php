<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            // Rating of the product itself. `rating` stays the seller rating.
            // Nullable so reviews written before this feature still load.
            if (! Schema::hasColumn('reviews', 'product_rating')) {
                $table->unsignedTinyInteger('product_rating')->nullable()->after('rating');
            }
            if (! Schema::hasColumn('reviews', 'seller_reply')) {
                $table->text('seller_reply')->nullable()->after('comment');
            }
            if (! Schema::hasColumn('reviews', 'seller_replied_at')) {
                $table->timestamp('seller_replied_at')->nullable()->after('seller_reply');
            }
            if (! Schema::hasIndex('reviews', ['listing_id'])) {
                $table->index('listing_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasIndex('reviews', ['listing_id'])) {
                $table->dropIndex(['listing_id']);
            }
            $drop = array_values(array_filter(
                ['product_rating', 'seller_reply', 'seller_replied_at'],
                fn ($c) => Schema::hasColumn('reviews', $c)
            ));
            if ($drop) {
                $table->dropColumn($drop);
            }
        });
    }
};
