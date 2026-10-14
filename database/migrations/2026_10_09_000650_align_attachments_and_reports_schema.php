<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brings attachments/reports up to date on databases that already ran an
 * earlier draft of the attachments and report-escalation migrations. On a
 * fresh database those migrations already create these columns, so this
 * does nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attachments') && ! Schema::hasColumn('attachments', 'user_id')) {
            Schema::table('attachments', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->index();
            });
        }

        if (Schema::hasTable('reports') && ! Schema::hasColumn('reports', 'escalated_by')) {
            Schema::table('reports', function (Blueprint $table) {
                $table->unsignedBigInteger('escalated_by')->nullable();
            });
        }
    }

    public function down(): void
    {
        // Intentionally empty: the columns belong to the earlier migrations.
    }
};
