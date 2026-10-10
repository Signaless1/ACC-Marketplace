<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            // Units still available to order. Orders reserve units; cancelled
            // orders give them back.
            $table->unsignedInteger('quantity')->default(1)->after('price');

            // Why a moderator took the listing down (shown to the seller).
            $table->string('removed_reason')->nullable()->after('hidden_at');
            $table->text('removed_note')->nullable()->after('removed_reason');
            $table->unsignedBigInteger('removed_by')->nullable()->after('removed_note');
        });

        // Listings that are already reserved/sold have no units left to sell.
        DB::table('listings')
            ->whereIn('status', ['reserved', 'sold'])
            ->update(['quantity' => 0]);
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'removed_reason', 'removed_note', 'removed_by']);
        });
    }
};
