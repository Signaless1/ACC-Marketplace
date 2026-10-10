<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            // Set by admins/moderation to hide a listing from the marketplace.
            $table->timestamp('hidden_at')->nullable()->after('views_count');
            $table->index(['status', 'hidden_at']);
        });
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropIndex(['status', 'hidden_at']);
            $table->dropColumn('hidden_at');
        });
    }
};
