<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_files', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('upload_id')->nullable()->constrained('game_uploads')->nullOnDelete();
            $table->string('path', 512);
            $table->string('disk', 40)->default('games');
            $table->string('mime', 120);
            $table->bigInteger('size');
            $table->char('sha256', 64);
            $table->boolean('is_entry')->default(false);
            $table->timestamps();

            $table->unique(['game_id', 'path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_files');
    }
};
