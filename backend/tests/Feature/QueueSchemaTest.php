<?php

namespace Tests\Feature;

use App\Jobs\ProcessGameUpload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

final class QueueSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_queue_schema_matches_laravel_expectations(): void
    {
        self::assertTrue(Schema::hasColumn('jobs', 'reserved_at'));
        self::assertFalse(Schema::hasColumn('jobs', 'reserve_time'));
        self::assertTrue(Schema::hasTable('failed_jobs'));
    }

    public function test_upload_job_can_be_persisted_on_the_database_queue(): void
    {
        Queue::setDefaultDriver('database');

        ProcessGameUpload::dispatch(123);

        $this->assertDatabaseCount('jobs', 1);
    }
}
