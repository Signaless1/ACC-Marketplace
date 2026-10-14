<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Audit trail of listing removals. Snapshot columns keep the record
        // meaningful even after the listing row is permanently deleted.
        Schema::create('moderation_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('listing_id')->nullable();
            $table->string('listing_title');
            $table->unsignedBigInteger('seller_id')->nullable();

            // hidden | deleted | restored
            $table->string('action', 20);
            $table->string('reason')->nullable();
            $table->text('note')->nullable();

            $table->timestamps();

            $table->index('listing_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_logs');
    }
};
