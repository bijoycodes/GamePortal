"use client";

import { ErrorState } from "@/components/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <ErrorState
        title="Unable to load this page"
        message={error.digest ? `Request reference: ${error.digest}` : undefined}
        onRetry={reset}
      />
    </div>
  );
}
