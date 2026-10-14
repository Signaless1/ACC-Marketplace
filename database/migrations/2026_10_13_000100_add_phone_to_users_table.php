<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'phone')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            // Stored in one canonical form: 11 digits, 09XXXXXXXXX.
            // Nullable so accounts created before this change keep working;
            // unique so one number cannot back several accounts.
            $table->string('phone', 11)->nullable()->unique();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'phone')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->dropColumn('phone');
        });
    }
};
