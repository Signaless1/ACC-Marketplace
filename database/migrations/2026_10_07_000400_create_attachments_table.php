<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('attachments')) {
            Schema::create('attachments', function (Blueprint $table) {
                $table->id();

                // Messages and reviews both own attachments.
                $table->morphs('attachable');

                $table->string('disk')->default('public');
                $table->string('path');
                $table->string('original_name');
                $table->string('mime');
                $table->unsignedBigInteger('size');

                // image | video | file
                $table->string('kind', 10);

                $table->timestamps();
            });

            return;
        }

        // A table with this name already exists (for example from another
        // version of the project): add whichever columns are missing.
        Schema::table('attachments', function (Blueprint $table) {
            $columns = [
                'attachable_type' => fn () => $table->string('attachable_type')->nullable(),
                'attachable_id' => fn () => $table->unsignedBigInteger('attachable_id')->nullable(),
                'disk' => fn () => $table->string('disk')->default('public'),
                'path' => fn () => $table->string('path')->nullable(),
                'original_name' => fn () => $table->string('original_name')->nullable(),
                'mime' => fn () => $table->string('mime')->nullable(),
                'size' => fn () => $table->unsignedBigInteger('size')->default(0),
                'kind' => fn () => $table->string('kind', 10)->default('file'),
                'created_at' => fn () => $table->timestamp('created_at')->nullable(),
                'updated_at' => fn () => $table->timestamp('updated_at')->nullable(),
            ];

            foreach ($columns as $name => $add) {
                if (! Schema::hasColumn('attachments', $name)) {
                    $add();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
