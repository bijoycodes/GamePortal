<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isPostgres = DB::connection()->getDriverName() === 'pgsql';

        Schema::create('game_events', function (Blueprint $table) use ($isPostgres): void {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('session_id')->nullable()->constrained('game_sessions')->nullOnDelete();
            $table->string('type', 40);
            if ($isPostgres) {
                $table->jsonb('metadata')->default('{}');
            } else {
                $table->json('metadata')->default('{}');
            }
            $table->timestamp('occurred_at');
            $table->timestamp('created_at');

            $table->index(['game_id', 'occurred_at']);
            $table->index(['session_id', 'occurred_at']);
            $table->index('type');
        });

        if ($isPostgres) {
            DB::statement("ALTER TABLE game_events ADD CONSTRAINT game_events_type_check CHECK (type IN ('start', 'end', 'score', 'level_complete', 'custom'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('game_events');
    }
};
