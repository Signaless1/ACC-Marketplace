<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'suspension_reason')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->text('suspension_reason')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'suspension_reason')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('suspension_reason');
        });
    }
};
