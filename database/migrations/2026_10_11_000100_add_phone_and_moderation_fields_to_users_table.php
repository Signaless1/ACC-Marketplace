<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Philippine mobile number in international form, e.g. +639171234567.
            // Nullable because accounts created before this column existed have
            // none; every new account must provide one. Unique so one number
            // cannot back several accounts. Never shown to other users.
            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 16)->nullable()->unique();
            }

            // manual (an admin did it) | auto (the report algorithm did it).
            // Only automatic suspensions are ever lifted automatically.
            if (! Schema::hasColumn('users', 'suspension_type')) {
                $table->string('suspension_type', 10)->nullable();
            }

            // When an admin last reinstated the account. Reports filed before
            // this moment no longer count towards an automatic suspension.
            if (! Schema::hasColumn('users', 'reinstated_at')) {
                $table->timestamp('reinstated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'phone')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique(['phone']);
            });
        }

        $drop = array_values(array_filter(
            ['phone', 'suspension_type', 'reinstated_at'],
            fn ($column) => Schema::hasColumn('users', $column)
        ));

        if ($drop) {
            Schema::table('users', function (Blueprint $table) use ($drop) {
                $table->dropColumn($drop);
            });
        }
    }
};
