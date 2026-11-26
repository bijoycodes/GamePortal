<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use Illuminate\Console\Command;

final class AuditPruneCommand extends Command
{
    protected $signature = 'audit:prune';

    protected $description = 'Delete audit log rows older than 24 months';

    public function handle(): int
    {
        $deleted = AuditLog::query()->where('created_at', '<', now()->subMonths(24))->delete();

        $this->info(sprintf('Pruned %d audit log rows.', $deleted));

        return self::SUCCESS;
    }
}
