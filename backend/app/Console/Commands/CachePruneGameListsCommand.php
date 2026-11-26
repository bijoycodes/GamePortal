<?php

namespace App\Console\Commands;

use App\Services\GameCatalogService;
use Illuminate\Console\Command;

final class CachePruneGameListsCommand extends Command
{
    protected $signature = 'cache:prune-game-lists';

    protected $description = 'Remove expired cached game catalogue list keys';

    public function handle(GameCatalogService $catalog): int
    {
        $pruned = $catalog->pruneStaleLists();

        $this->info(sprintf('Pruned %d stale game catalogue cache keys.', $pruned));

        return self::SUCCESS;
    }
}
