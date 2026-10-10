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
            $table->unsignedBigInteger('order_id')->nullable()->after('reported_user_id');
            $table->index('order_id');

            // Filled in when an admin refers the case to a figure of authority.
            $table->string('escalated_to')->nullable()->after('reviewed_at');
            $table->text('escalation_note')->nullable()->after('escalated_to');
            $table->timestamp('escalated_at')->nullable()->after('escalation_note');
        });
    }

    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex(['order_id']);
            $table->dropColumn(['order_id', 'escalated_to', 'escalation_note', 'escalated_at']);
        });
    }
};
