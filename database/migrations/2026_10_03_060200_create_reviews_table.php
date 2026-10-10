<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();

            // One review per order, enforced at the database level.
            $table->foreignId('order_id')
                ->unique()
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('listing_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('reviewer_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('seller_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();

            $table->timestamps();

            $table->index('seller_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
