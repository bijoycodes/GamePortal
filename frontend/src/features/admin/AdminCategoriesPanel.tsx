"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { browserFetch, getErrorMessage } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { Category, Paginator } from "@/types/api";
import { ApiErrorBanner } from "./ApiErrorBanner";
import { AdminLoading } from "./AdminLoading";
import { useAdminResource } from "./useAdminResource";

interface FormState {
  id: number | null;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  slug: "",
  description: "",
  icon: "",
  sort_order: "0",
  is_active: true,
};

export function AdminCategoriesPanel() {
  const { data, loading, error, reload } = useAdminResource<Paginator<Category>>(
    "/api/admin/categories?per_page=50",
  );
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
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        icon: form.icon.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      await browserFetch(form.id ? `/api/admin/categories/${form.id}` : "/api/admin/categories", {
        method: form.id ? "PATCH" : "POST",
        body: payload,
      });
      setForm(emptyForm);
      reload();
    } catch (cause) {
      setBanner(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: Category): Promise<void> {
    if (!window.confirm(`Delete category "${category.name}"? Games using it must be reassigned first.`)) return;
    setBanner(null);
    try {
      await browserFetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      reload();
    } catch (cause) {
      setBanner(getErrorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <ApiErrorBanner message={error} />
        <ApiErrorBanner message={banner} />
        {loading && !data ? (
          <AdminLoading label="Loading categories…" />
        ) : data && data.data.length > 0 ? (
          <div className="panel overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Slug</th>
                  <th scope="col">Games</th>
                  <th scope="col">Active</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((category) => (
                  <tr key={category.id}>
                    <td className="font-medium">{category.name}</td>
                    <td className="font-mono text-xs text-slate-400">{category.slug}</td>
                    <td>{formatNumber(category.game_count)}</td>
                    <td>{category.is_active === false ? "No" : "Yes"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-2 py-1"
                          aria-label={`Edit ${category.name}`}
                          onClick={() =>
                            setForm({
                              id: category.id,
                              name: category.name,
                              slug: category.slug,
                              description: category.description ?? "",
                              icon: category.icon ?? "",
                              sort_order: String(category.sort_order ?? 0),
                              is_active: category.is_active !== false,
                            })
                          }
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="btn-danger px-2 py-1"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => remove(category)}
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
          <EmptyState title="No categories yet" description="Create the first category with the form alongside." />
        )}
      </div>

      <form onSubmit={submit} className="panel h-fit space-y-3 p-5">
        <h2 className="text-lg font-semibold text-white">{form.id ? "Edit category" : "New category"}</h2>
        <div>
          <label htmlFor="category-name" className="label">
            Name
          </label>
          <input
            id="category-name"
            className="input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="category-slug" className="label">
            Slug (optional)
          </label>
          <input
            id="category-slug"
            className="input"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="category-description" className="label">
            Description
          </label>
          <textarea
            id="category-description"
            className="input min-h-20"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="category-icon" className="label">
              Icon key
            </label>
            <input
              id="category-icon"
              className="input"
              value={form.icon}
              onChange={(event) => setForm({ ...form, icon: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="category-order" className="label">
              Sort order
            </label>
            <input
              id="category-order"
              type="number"
              className="input"
              value={form.sort_order}
              onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-950"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
          Active (visible to players)
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : form.id ? "Save category" : "Create category"}
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
