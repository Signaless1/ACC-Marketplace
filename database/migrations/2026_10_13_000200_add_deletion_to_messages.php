<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('messages', 'deleted_for_everyone_at')) {
            Schema::table('messages', function (Blueprint $table) {
                // "Delete for everyone": set by the sender. The row is kept
                // (admins still need it as evidence in a reported transaction)
                // but its text and files are never shown to the two users again.
                $table->timestamp('deleted_for_everyone_at')->nullable();
            });
        }

        if (! Schema::hasTable('message_deletions')) {
            // "Delete for me": one row per person who hid a message for themselves.
            Schema::create('message_deletions', function (Blueprint $table) {
                $table->foreignId('message_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->timestamps();

                $table->primary(['message_id', 'user_id']);
                $table->index('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('message_deletions');

        if (Schema::hasColumn('messages', 'deleted_for_everyone_at')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->dropColumn('deleted_for_everyone_at');
            });
        }
    }
};
