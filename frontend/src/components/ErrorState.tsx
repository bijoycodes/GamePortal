"use client";

import Link from "next/link";
import { AlertIcon } from "./icons";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryHref?: string;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this content. Please try again.",
  onRetry,
  retryHref,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <div role="alert" className="panel flex flex-col items-center gap-3 border-red-900/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950 text-red-300">
        <AlertIcon className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="muted max-w-md">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary mt-2">
          {retryLabel}
        </button>
      )}
      {!onRetry && retryHref && (
        <Link href={retryHref} className="btn-primary mt-2">
          {retryLabel}
        </Link>
      )}
    </div>
  );
}
