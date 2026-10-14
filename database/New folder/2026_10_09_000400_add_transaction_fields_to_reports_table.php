<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            // Set when the report is about a specific transaction (order).
            if (! Schema::hasColumn('reports', 'order_id')) {
                $table->unsignedBigInteger('order_id')->nullable()->after('reported_user_id');
                $table->index('order_id');
            }

            // Filled in when an admin refers the case to a figure of authority.
            if (! Schema::hasColumn('reports', 'escalated_to')) {
                $table->string('escalated_to')->nullable()->after('reviewed_at');
            }
            if (! Schema::hasColumn('reports', 'escalation_note')) {
                $table->text('escalation_note')->nullable()->after('escalated_to');
            }
            if (! Schema::hasColumn('reports', 'escalated_at')) {
                $table->timestamp('escalated_at')->nullable()->after('escalation_note');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $drop = array_values(array_filter(
                ['order_id', 'escalated_to', 'escalation_note', 'escalated_at'],
                fn ($c) => Schema::hasColumn('reports', $c)
            ));
            if ($drop) {
                $table->dropColumn($drop);
            }
        });
    }
};
