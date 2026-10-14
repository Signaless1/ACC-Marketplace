<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // An earlier migration (2026_10_07_000400) already creates this table;
        // running both on a fresh database used to fail with "table already exists".
        if (Schema::hasTable('attachments')) {
            return;
        }

        // One table for every uploaded file that hangs off a message or review.
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();

            $table->morphs('attachable');

            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size')->default(0);

            // image | video | file
            $table->string('kind', 10)->default('file');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
