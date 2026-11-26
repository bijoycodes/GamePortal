<?php

// The repository-root JSON file is the single source for archive limits and allowlists.
$policyPath = dirname(__DIR__, 2).'/config/game-package-policy.json';
$policy = json_decode((string) @file_get_contents($policyPath), true);
$policy = is_array($policy) ? $policy : [];

return [
    'max_compressed_bytes' => (int) env('MAX_UPLOAD_MB', 50) * 1024 * 1024,
    'max_uncompressed_bytes' => (int) env('MAX_UNCOMPRESSED_MB', 150) * 1024 * 1024,
    'max_files' => (int) env('MAX_UPLOAD_FILES', 500),
    'max_single_file_bytes' => 25 * 1024 * 1024,
    'max_entry_path_length' => (int) ($policy['limits']['maxEntryPathLength'] ?? 255),
    'allowed_extensions' => $policy['allowedExtensions'] ?? [],
    'denied_extensions' => $policy['deniedExtensions'] ?? [],
    'entry_candidates' => $policy['requiredEntryCandidates'] ?? ['index.html', 'index.htm'],
    'reject' => $policy['reject'] ?? [],
];
