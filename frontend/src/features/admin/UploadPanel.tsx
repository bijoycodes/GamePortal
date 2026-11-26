"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { TrashIcon, UploadIcon } from "@/components/icons";
import { browserFetch, getErrorMessage } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { GameUpload } from "@/types/api";
import { ApiErrorBanner } from "./ApiErrorBanner";

const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const ALLOWED_ZIP_TYPES = ["application/zip", "application/x-zip-compressed", "application/octet-stream", ""];

function validateZip(file: File | null): string | null {
  if (!file) return "Choose a ZIP file to upload.";
  if (!file.name.toLowerCase().endsWith(".zip")) return "Package must have a .zip extension.";
  if (!ALLOWED_ZIP_TYPES.includes(file.type)) return "Package must be a ZIP archive.";
  if (file.size > MAX_ZIP_BYTES) return "Package must be at most 50 MB.";
  return null;
}

export interface UploadPanelProps {
  gameId: number;
  uploads: GameUpload[];
  entryFile: string | null;
}

export function UploadPanel({ gameId, uploads, entryFile }: UploadPanelProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = uploads.some((upload) => upload.status === "pending" || upload.status === "processing");

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [pending, router]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationError = validateZip(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("package", file as File, (file as File).name);
      const result = await browserFetch<{ message: string }>(`/api/admin/games/${gameId}/upload`, {
        method: "POST",
        body,
      });
      setMessage(result.message ?? "Upload queued for processing.");
      setFile(null);
      router.refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove(upload: GameUpload): Promise<void> {
    if (!window.confirm(`Delete upload "${upload.original_filename}" and its extracted files?`)) return;
    setError(null);
    try {
      await browserFetch(`/api/admin/uploads/${upload.id}`, { method: "DELETE" });
      router.refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <section className="panel space-y-4 p-5" aria-labelledby="upload-heading">
      <div>
        <h2 id="upload-heading" className="text-lg font-semibold text-white">
          Game package
        </h2>
        <p className="muted mt-1">
          Upload a self-contained ZIP. Current entry file:{" "}
          <code className="text-slate-200">{entryFile ?? "not set yet"}</code>
        </p>
      </div>

      <ApiErrorBanner message={error} />
      {message && (
        <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {pending && <p className="muted">Processing is in progress; this page updates automatically.</p>}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="game-package" className="label">
            ZIP package
          </label>
          <input
            id="game-package"
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="input"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={busy || pending}>
          <UploadIcon className="h-4 w-4" />
          {busy ? "Uploading…" : "Upload package"}
        </button>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Upload history</h3>
        {uploads.length === 0 ? (
          <p className="muted">No uploads recorded for this game.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Status</th>
                  <th scope="col">Size</th>
                  <th scope="col">Uploaded</th>
                  <th scope="col" className="text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload.id}>
                    <td className="font-medium">{upload.original_filename}</td>
                    <td>
                      <StatusBadge status={upload.status} />
                      {upload.error_message && <p className="muted text-xs text-red-300">{upload.error_message}</p>}
                    </td>
                    <td className="whitespace-nowrap text-slate-400">{formatBytes(upload.total_size)}</td>
                    <td className="whitespace-nowrap text-slate-400">{formatDateTime(upload.created_at)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn-danger px-2 py-1"
                        onClick={() => remove(upload)}
                        aria-label={`Delete upload ${upload.original_filename}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
