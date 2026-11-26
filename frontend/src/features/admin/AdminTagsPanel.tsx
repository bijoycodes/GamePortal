"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { browserFetch, getErrorMessage } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { Paginator, Tag } from "@/types/api";
import { ApiErrorBanner } from "./ApiErrorBanner";
import { AdminLoading } from "./AdminLoading";
import { useAdminResource } from "./useAdminResource";

interface FormState {
  id: number | null;
  name: string;
  slug: string;
}

const emptyForm: FormState = { id: null, name: "", slug: "" };

export function AdminTagsPanel() {
  const { data, loading, error, reload } = useAdminResource<Paginator<Tag>>("/api/admin/tags?per_page=50");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form.name.trim()) {
      setBanner("Name is required.");
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await browserFetch(form.id ? `/api/admin/tags/${form.id}` : "/api/admin/tags", {
        method: form.id ? "PATCH" : "POST",
        body: { name: form.name.trim(), slug: form.slug.trim() },
      });
      setForm(emptyForm);
      reload();
    } catch (cause) {
      setBanner(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function remove(tag: Tag): Promise<void> {
    if (!window.confirm(`Delete tag "${tag.name}"? It will be detached from all games.`)) return;
    setBanner(null);
    try {
      await browserFetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" });
      reload();
    } catch (cause) {
      setBanner(getErrorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <ApiErrorBanner message={error} />
        <ApiErrorBanner message={banner} />
        {loading && !data ? (
          <AdminLoading label="Loading tags…" />
        ) : data && data.data.length > 0 ? (
          <div className="panel overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Slug</th>
                  <th scope="col">Games</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((tag) => (
                  <tr key={tag.id}>
                    <td className="font-medium">{tag.name}</td>
                    <td className="font-mono text-xs text-slate-400">{tag.slug}</td>
                    <td>{formatNumber(tag.game_count)}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-2 py-1"
                          aria-label={`Edit ${tag.name}`}
                          onClick={() => setForm({ id: tag.id, name: tag.name, slug: tag.slug })}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-danger px-2 py-1"
                          aria-label={`Delete ${tag.name}`}
                          onClick={() => remove(tag)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No tags yet" description="Create the first tag with the form alongside." />
        )}
      </div>

      <form onSubmit={submit} className="panel h-fit space-y-3 p-5">
        <h2 className="text-lg font-semibold text-white">{form.id ? "Edit tag" : "New tag"}</h2>
        <div>
          <label htmlFor="tag-name" className="label">
            Name
          </label>
          <input
            id="tag-name"
            className="input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="tag-slug" className="label">
            Slug (optional)
          </label>
          <input
            id="tag-slug"
            className="input"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : form.id ? "Save tag" : "Create tag"}
          </button>
          {form.id && (
            <button type="button" className="btn-secondary" onClick={() => setForm(emptyForm)}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
