<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('analytics:prune')->dailyAt('02:00')->timezone('UTC');
Schedule::command('audit:prune')->dailyAt('02:00')->timezone('UTC');
Schedule::command('cache:prune-game-lists')->dailyAt('02:00')->timezone('UTC');
