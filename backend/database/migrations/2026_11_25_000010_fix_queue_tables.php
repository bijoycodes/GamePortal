<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Early local databases were created with `reserve_time` instead of Laravel's
     * `reserved_at`, and without `failed_jobs`, which broke the database queue.
     */
    public function up(): void
    {
        if (Schema::hasTable('jobs') && ! Schema::hasColumn('jobs', 'reserved_at')) {
            Schema::table('jobs', function (Blueprint $table): void {
                $table->unsignedInteger('reserved_at')->nullable();
            });
        }

        if (Schema::hasColumn('jobs', 'reserve_time')) {
            Schema::table('jobs', function (Blueprint $table): void {
                $table->dropColumn('reserve_time');
            });
        }

        if (! Schema::hasTable('failed_jobs')) {
            Schema::create('failed_jobs', function (Blueprint $table): void {
                $table->id();
                $table->string('uuid')->unique();
                $table->text('connection');
                $table->text('queue');
                $table->longText('payload');
                $table->longText('exception');
                $table->timestamp('failed_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('failed_jobs');
    }
};
