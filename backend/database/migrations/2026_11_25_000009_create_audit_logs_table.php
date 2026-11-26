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

        Schema::create('audit_logs', function (Blueprint $table) use ($isPostgres): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 80);
            $table->string('subject_type', 120);
            $table->bigInteger('subject_id')->nullable();
            if ($isPostgres) {
                $table->jsonb('metadata')->default('{}');
            } else {
                $table->json('metadata')->default('{}');
            }
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->timestamp('created_at');

            $table->index('created_at');
            $table->index(['subject_type', 'subject_id']);
        });

        if ($isPostgres) {
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'player'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
