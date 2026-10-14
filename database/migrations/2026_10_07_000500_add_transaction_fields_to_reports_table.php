<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (! Schema::hasColumn('reports', 'order_id')) {
                $table->foreignId('order_id')
                    ->nullable()
                    ->constrained()
                    ->nullOnDelete();
            }

            // Set when an admin forwards the report to a figure of authority.
            if (! Schema::hasColumn('reports', 'escalated_to')) {
                $table->string('escalated_to')->nullable();
            }

            if (! Schema::hasColumn('reports', 'escalated_at')) {
                $table->timestamp('escalated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (Schema::hasColumn('reports', 'order_id')) {
                $table->dropConstrainedForeignId('order_id');
            }

            $drop = array_values(array_filter(
                ['escalated_to', 'escalated_at'],
                fn ($column) => Schema::hasColumn('reports', $column)
            ));

            if ($drop) {
                $table->dropColumn($drop);
            }
        });
    }
};
