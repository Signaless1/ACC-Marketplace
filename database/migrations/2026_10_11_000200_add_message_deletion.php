<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Delete for everyone": the message stays in the table (admins can
        // still review it during a dispute) but is hidden from both people.
        if (! Schema::hasColumn('messages', 'deleted_for_everyone_at')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->timestamp('deleted_for_everyone_at')->nullable()->index();
            });
        }

        // "Delete for me": hides one message from one person's view only.
        if (! Schema::hasTable('message_deletions')) {
            Schema::create('message_deletions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('message_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->timestamp('created_at')->useCurrent();

                $table->unique(['message_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('message_deletions');

        if (Schema::hasColumn('messages', 'deleted_for_everyone_at')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->dropIndex(['deleted_for_everyone_at']);
            });

            Schema::table('messages', function (Blueprint $table) {
                $table->dropColumn('deleted_for_everyone_at');
            });
        }
    }
};
