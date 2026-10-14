<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            foreach (['confirmed_at', 'completed_at', 'cancelled_at'] as $column) {
                if (! Schema::hasColumn('orders', $column)) {
                    $table->timestamp($column)->nullable();
                }
            }

            if (! Schema::hasColumn('orders', 'cancelled_by')) {
                $table->foreignId('cancelled_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('orders', 'cancel_reason')) {
                $table->string('cancel_reason', 255)->nullable();
            }
        });

        // Best-effort backfill for orders that already finished.
        DB::table('orders')
            ->where('status', 'completed')
            ->whereNull('completed_at')
            ->update(['completed_at' => DB::raw('updated_at')]);

        DB::table('orders')
            ->where('status', 'cancelled')
            ->whereNull('cancelled_at')
            ->update(['cancelled_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'cancelled_by')) {
                $table->dropConstrainedForeignId('cancelled_by');
            }

            $drop = array_values(array_filter(
                ['confirmed_at', 'completed_at', 'cancelled_at', 'cancel_reason'],
                fn ($column) => Schema::hasColumn('orders', $column)
            ));

            if ($drop) {
                $table->dropColumn($drop);
            }
        });
    }
};
