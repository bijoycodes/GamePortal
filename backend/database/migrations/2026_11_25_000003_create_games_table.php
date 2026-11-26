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

        Schema::create('games', function (Blueprint $table) use ($isPostgres): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('title', 180);
            $table->string('slug', 200)->unique();
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('thumbnail_path', 512)->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->boolean('featured')->default(false);
            $table->string('orientation', 20)->default('any');
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->string('entry_file', 512)->nullable();
            $table->string('version', 40)->default('1.0.0');
            $table->string('developer', 120)->nullable();
            $table->smallInteger('release_year')->nullable();
            $table->string('license_name', 120)->nullable();
            $table->string('license_url', 512)->nullable();
            $table->text('attribution')->nullable();
            if ($isPostgres) {
                $table->jsonb('settings')->default('{}');
            } else {
                $table->json('settings')->default('{}');
            }
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['category_id', 'status']);
            $table->index(['featured', 'status']);
        });

        if ($isPostgres) {
            DB::statement('CREATE INDEX games_settings_gin ON games USING GIN (settings)');
            DB::statement("ALTER TABLE games ADD CONSTRAINT games_status_check CHECK (status IN ('draft', 'published', 'disabled', 'archived'))");
            DB::statement("ALTER TABLE games ADD CONSTRAINT games_orientation_check CHECK (orientation IN ('landscape', 'portrait', 'any'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
