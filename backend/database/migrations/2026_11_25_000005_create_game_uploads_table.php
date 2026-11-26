<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_uploads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploader_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_filename', 255);
            $table->string('raw_path', 512);
            $table->string('disk', 40)->default('games');
            $table->string('status', 20)->default('pending');
            $table->text('error_message')->nullable();
            $table->integer('file_count')->default(0);
            $table->bigInteger('total_size')->default(0);
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['game_id', 'created_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE game_uploads ADD CONSTRAINT game_uploads_status_check CHECK (status IN ('pending', 'processing', 'published', 'failed'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('game_uploads');
    }
};
