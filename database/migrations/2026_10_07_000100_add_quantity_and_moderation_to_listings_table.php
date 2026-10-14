<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Every column is only added when it is missing, so this migration is
        // safe on a database that already has some of them.
        Schema::table('listings', function (Blueprint $table) {
            if (! Schema::hasColumn('listings', 'quantity')) {
                // Units that can still be ordered (not counting reserved units).
                $table->unsignedInteger('quantity')->default(1)->after('price');
            }

            // Why a moderator removed the listing (hidden_at is the "when").
            if (! Schema::hasColumn('listings', 'removed_reason')) {
                $table->string('removed_reason')->nullable();
            }

            if (! Schema::hasColumn('listings', 'removed_note')) {
                $table->text('removed_note')->nullable();
            }

            if (! Schema::hasColumn('listings', 'removed_by')) {
                $table->foreignId('removed_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });

        // Listings that were already reserved/sold have no units left to order.
        DB::table('listings')
            ->whereIn('status', ['reserved', 'sold'])
            ->update(['quantity' => 0]);
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            if (Schema::hasColumn('listings', 'removed_by')) {
                $table->dropConstrainedForeignId('removed_by');
            }

            $drop = array_values(array_filter(
                ['quantity', 'removed_reason', 'removed_note'],
                fn ($column) => Schema::hasColumn('listings', $column)
            ));

            if ($drop) {
                $table->dropColumn($drop);
            }
        });
    }
};
