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
            if (! Schema::hasColumn('listings', 'quantity')) {
                $table->unsignedInteger('quantity')->default(1)->after('price');
            }

            // Why a moderator took the listing down (shown to the seller).
            if (! Schema::hasColumn('listings', 'removed_reason')) {
                $table->string('removed_reason')->nullable()->after('hidden_at');
            }
            if (! Schema::hasColumn('listings', 'removed_note')) {
                $table->text('removed_note')->nullable()->after('removed_reason');
            }
            if (! Schema::hasColumn('listings', 'removed_by')) {
                $table->unsignedBigInteger('removed_by')->nullable()->after('removed_note');
            }
        });

        // Listings that are already reserved/sold have no units left to sell.
        // (Skipped when the column was added earlier and stock is already tracked.)
        DB::table('listings')
            ->whereIn('status', ['reserved', 'sold'])
            ->where('quantity', '>', 0)
            ->update(['quantity' => 0]);
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $drop = array_values(array_filter(
                ['quantity', 'removed_reason', 'removed_note', 'removed_by'],
                fn ($c) => Schema::hasColumn('listings', $c)
            ));
            if ($drop) {
                $table->dropColumn($drop);
            }
        });
    }
};
