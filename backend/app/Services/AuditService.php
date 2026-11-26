<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

final class AuditService
{
    /** @param array<string, mixed> $metadata */
    public function record(
        string $action,
        string $subjectType,
        ?int $subjectId,
        array $metadata = [],
        ?User $user = null,
    ): AuditLog {
        $request = request();

        return AuditLog::create([
            'user_id' => $user?->id ?? auth()->user()?->id,
            'action' => mb_substr($action, 0, 80),
            'subject_type' => mb_substr($subjectType, 0, 120),
            'subject_id' => $subjectId,
            'metadata' => $this->redact($metadata),
            'ip' => $request->ip() === null ? null : mb_substr((string) $request->ip(), 0, 45),
            'user_agent' => $request->userAgent() === null
                ? null
                : mb_substr($request->userAgent(), 0, 512),
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    private function redact(array $metadata): array
    {
        $redacted = [];
        foreach ($metadata as $key => $value) {
            if (preg_match('/password|token|secret|key/i', (string) $key) === 1) {
                $redacted[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $redacted[$key] = $this->redact($value);
            } else {
                $redacted[$key] = $value;
            }
        }

        return $redacted;
    }
}
