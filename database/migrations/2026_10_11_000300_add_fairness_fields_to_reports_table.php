<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            // buyer | seller for transaction reports; null for listing/user reports.
            if (! Schema::hasColumn('reports', 'reporter_role')) {
                $table->string('reporter_role', 10)->nullable();
            }

            // The reported person's side of the story, written once.
            if (! Schema::hasColumn('reports', 'respondent_statement')) {
                $table->text('respondent_statement')->nullable();
            }

            if (! Schema::hasColumn('reports', 'responded_at')) {
                $table->timestamp('responded_at')->nullable();
            }

            // The explanation of the outcome, shown to BOTH people. (admin_note
            // stays internal.)
            if (! Schema::hasColumn('reports', 'decision_note')) {
                $table->text('decision_note')->nullable();
            }

            // Set by an admin when a dismissed report was false or malicious.
            if (! Schema::hasColumn('reports', 'bad_faith')) {
                $table->boolean('bad_faith')->default(false);
            }

            $table->index(['reported_user_id', 'created_at']);
            $table->index(['reporter_id', 'created_at']);
        });

        // An append-only trail: who did what to a report, and when.
        if (! Schema::hasTable('report_events')) {
            Schema::create('report_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('report_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('event', 30);
                $table->text('note')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['report_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('report_events');

        Schema::table('reports', function (Blueprint $table) {
            $table->dropIndex(['reported_user_id', 'created_at']);
            $table->dropIndex(['reporter_id', 'created_at']);
        });

        $drop = array_values(array_filter(
            ['reporter_role', 'respondent_statement', 'responded_at', 'decision_note', 'bad_faith'],
            fn ($column) => Schema::hasColumn('reports', $column)
        ));

        if ($drop) {
            Schema::table('reports', function (Blueprint $table) use ($drop) {
                $table->dropColumn($drop);
            });
        }
    }
};
