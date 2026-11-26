"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField, describedBy } from "@/components/FormField";
import { ApiError, browserFetch, getErrorMessage, getFieldErrors } from "@/lib/api";
import { isHexColor, isValidHttpUrl, isValidSlug, slugify } from "@/lib/format";
import type { AdminGame, Category, GameSettings, Orientation, Tag } from "@/types/api";
import { ApiErrorBanner } from "./ApiErrorBanner";

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface FormValues {
  title: string;
  slug: string;
  description: string;
  instructions: string;
  category_id: string;
  tag_ids: number[];
  orientation: Orientation;
  width: string;
  height: string;
  version: string;
  developer: string;
  release_year: string;
  license_name: string;
  license_url: string;
  attribution: string;
  featured: boolean;
  requireFullscreen: boolean;
  backgroundColor: string;
  publisherId: string;
  customCss: string;
  muteByDefault: boolean;
  showFps: boolean;
  controlsHint: string;
  targetScore: string;
}

const emptyValues: FormValues = {
  title: "",
  slug: "",
  description: "",
  instructions: "",
  category_id: "",
  tag_ids: [],
  orientation: "any",
  width: "",
  height: "",
  version: "1.0.0",
  developer: "",
  release_year: "",
  license_name: "",
  license_url: "",
  attribution: "",
  featured: false,
  requireFullscreen: false,
  backgroundColor: "",
  publisherId: "",
  customCss: "",
  muteByDefault: false,
  showFps: false,
  controlsHint: "",
  targetScore: "",
};

function valuesFromGame(game: AdminGame | undefined): FormValues {
  if (!game) return { ...emptyValues };
  const settings: GameSettings = game.settings ?? {};
  return {
    title: game.title,
    slug: game.slug,
    description: game.description ?? "",
    instructions: game.instructions ?? "",
    category_id: game.category ? String(game.category.id) : "",
    tag_ids: game.tags.map((tag) => tag.id),
    orientation: game.orientation,
    width: game.width ? String(game.width) : "",
    height: game.height ? String(game.height) : "",
    version: game.version,
    developer: game.developer ?? "",
    release_year: game.release_year ? String(game.release_year) : "",
    license_name: game.license.name ?? "",
    license_url: game.license.url ?? "",
    attribution: game.license.attribution ?? "",
    featured: game.featured,
    requireFullscreen: settings.requireFullscreen ?? false,
    backgroundColor: settings.backgroundColor ?? "",
    publisherId: settings.publisherId ?? "",
    customCss: settings.customCss ?? "",
    muteByDefault: settings.muteByDefault ?? false,
    showFps: settings.showFps ?? false,
    controlsHint: settings.controlsHint ?? "",
    targetScore: settings.targetScore !== undefined ? String(settings.targetScore) : "",
  };
}

function validate(values: FormValues, thumbnail: File | null): Record<string, string> {
  const errors: Record<string, string> = {};

  if (values.title.trim().length < 1 || values.title.length > 180) errors.title = "Title must be 1–180 characters.";
  if (!isValidSlug(values.slug)) errors.slug = "Use lowercase letters, numbers and single hyphens.";
  if (values.description.length > 5000) errors.description = "Description is too long.";
  if (values.version.length > 40) errors.version = "Version must be at most 40 characters.";
  if (values.developer.length > 120) errors.developer = "Developer must be at most 120 characters.";

  for (const key of ["width", "height"] as const) {
    const raw = values[key].trim();
    if (!raw) continue;
    const number = Number(raw);
    if (!Number.isInteger(number) || number < 1 || number > 8192) {
      errors[key] = "Enter a whole number between 1 and 8192.";
    }
  }

  if (values.release_year.trim()) {
    const year = Number(values.release_year);
    if (!Number.isInteger(year) || year < 1980 || year > 2027) errors.release_year = "Year must be between 1980 and 2027.";
  }
  if (values.license_name.length > 120) errors.license_name = "Licence name is too long.";
  if (values.license_url && !isValidHttpUrl(values.license_url)) errors.license_url = "Enter a valid http(s) URL.";
  if (values.backgroundColor && !isHexColor(values.backgroundColor)) {
    errors.backgroundColor = "Use a six-digit hex colour, e.g. #0f172a.";
  }
  if (values.publisherId.length > 120) errors.publisherId = "Publisher ID is too long.";
  if (values.customCss.length > 4096) errors.customCss = "Custom CSS must be at most 4096 characters.";
  if (values.controlsHint.length > 240) errors.controlsHint = "Controls hint must be at most 240 characters.";
  if (values.targetScore.trim()) {
    const score = Number(values.targetScore);
    if (!Number.isInteger(score) || score < 0 || score > 100_000_000) errors.targetScore = "Enter a score up to 100,000,000.";
  }
  if (thumbnail) {
    if (!ALLOWED_IMAGE_TYPES.includes(thumbnail.type)) errors.thumbnail = "Use a JPEG, PNG or WebP image.";
    if (thumbnail.size > MAX_THUMBNAIL_BYTES) errors.thumbnail = "Thumbnail must be at most 2 MB.";
  }

  return errors;
}

function buildFormData(values: FormValues, thumbnail: File | null): FormData {
  const data = new FormData();
  const textFields: Array<[string, string]> = [
    ["title", values.title.trim()],
    ["slug", values.slug.trim()],
    ["description", values.description.trim()],
    ["instructions", values.instructions.trim()],
    ["category_id", values.category_id],
    ["orientation", values.orientation],
    ["version", values.version.trim()],
    ["developer", values.developer.trim()],
    ["release_year", values.release_year.trim()],
    ["license_name", values.license_name.trim()],
    ["license_url", values.license_url.trim()],
    ["attribution", values.attribution.trim()],
  ];
  for (const [key, value] of textFields) data.append(key, value);

  if (values.width.trim()) data.append("width", values.width.trim());
  if (values.height.trim()) data.append("height", values.height.trim());

  data.append("featured", values.featured ? "1" : "0");
  for (const id of values.tag_ids) data.append("tag_ids[]", String(id));
  if (values.tag_ids.length === 0) data.append("tag_ids", "");

  const settings: Array<[string, string]> = [
    ["requireFullscreen", values.requireFullscreen ? "1" : "0"],
    ["muteByDefault", values.muteByDefault ? "1" : "0"],
    ["showFps", values.showFps ? "1" : "0"],
    ["backgroundColor", values.backgroundColor],
    ["publisherId", values.publisherId],
    ["customCss", values.customCss],
    ["controlsHint", values.controlsHint],
    ["targetScore", values.targetScore],
  ];
  for (const [key, value] of settings) data.append(`settings[${key}]`, value);

  if (thumbnail) data.append("thumbnail", thumbnail, thumbnail.name);
  return data;
}

export interface GameFormProps {
  game?: AdminGame;
  categories: Category[];
  tags: Tag[];
}

export function GameForm({ game, categories, tags }: GameFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => valuesFromGame(game));
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slugEdited, setSlugEdited] = useState(Boolean(game));

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function errorFor(field: string): string | undefined {
    return errors[field];
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaved(false);
    const nextErrors = validate(values, thumbnail);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setBanner("Please correct the highlighted fields before saving.");
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const isCreate = !game;
      const result = await browserFetch<{ id: number }>(isCreate ? "/api/admin/games" : `/api/admin/games/${game.id}`, {
        method: isCreate ? "POST" : "PATCH",
        body: buildFormData(values, thumbnail),
      });
      if (isCreate) {
        router.push(`/admin/games/${result.id}/edit`);
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch (cause) {
      setBanner(getErrorMessage(cause));
      if (cause instanceof ApiError) {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(cause.errors)) {
          fieldErrors[field] = messages[0] ?? "Invalid value.";
        }
        setErrors(fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <ApiErrorBanner message={banner} />
      {saved && (
        <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-sm text-emerald-200">
          Game saved successfully.
        </p>
      )}

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 text-lg font-semibold text-white">Basic information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="title" label="Title" required error={errorFor("title")}>
            <input
              id="title"
              className="input"
              maxLength={180}
              value={values.title}
              aria-invalid={Boolean(errorFor("title"))}
              aria-describedby={describedBy("title", errorFor("title"))}
              onChange={(event) => {
                const title = event.target.value;
                update("title", title);
                if (!slugEdited) update("slug", slugify(title));
              }}
            />
          </FormField>
          <FormField id="slug" label="Slug" required error={errorFor("slug")} hint="Lowercase letters, numbers and hyphens.">
            <input
              id="slug"
              className="input"
              maxLength={200}
              value={values.slug}
              aria-invalid={Boolean(errorFor("slug"))}
              aria-describedby={describedBy("slug", errorFor("slug"), "Lowercase letters, numbers and hyphens.")}
              onChange={(event) => {
                setSlugEdited(true);
                update("slug", event.target.value);
              }}
            />
          </FormField>
        </div>
        <FormField id="description" label="Description" error={errorFor("description")}>
          <textarea
            id="description"
            className="input min-h-24"
            value={values.description}
            aria-invalid={Boolean(errorFor("description"))}
            aria-describedby={describedBy("description", errorFor("description"))}
            onChange={(event) => update("description", event.target.value)}
          />
        </FormField>
        <FormField id="instructions" label="How to play" hint="Shown on the player page.">
          <textarea
            id="instructions"
            className="input min-h-20"
            value={values.instructions}
            onChange={(event) => update("instructions", event.target.value)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="category_id" label="Category">
            <select
              id="category_id"
              className="input"
              value={values.category_id}
              onChange={(event) => update("category_id", event.target.value)}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="orientation" label="Orientation">
            <select
              id="orientation"
              className="input"
              value={values.orientation}
              onChange={(event) => update("orientation", event.target.value as Orientation)}
            >
              <option value="any">Any</option>
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </FormField>
          <FormField id="version" label="Version" error={errorFor("version")}>
            <input
              id="version"
              className="input"
              maxLength={40}
              value={values.version}
              aria-invalid={Boolean(errorFor("version"))}
              aria-describedby={describedBy("version", errorFor("version"))}
              onChange={(event) => update("version", event.target.value)}
            />
          </FormField>
          <FormField id="width" label="Width (px)" error={errorFor("width")}>
            <input
              id="width"
              type="number"
              min={1}
              max={8192}
              className="input"
              value={values.width}
              aria-invalid={Boolean(errorFor("width"))}
              aria-describedby={describedBy("width", errorFor("width"))}
              onChange={(event) => update("width", event.target.value)}
            />
          </FormField>
          <FormField id="height" label="Height (px)" error={errorFor("height")}>
            <input
              id="height"
              type="number"
              min={1}
              max={8192}
              className="input"
              value={values.height}
              aria-invalid={Boolean(errorFor("height"))}
              aria-describedby={describedBy("height", errorFor("height"))}
              onChange={(event) => update("height", event.target.value)}
            />
          </FormField>
        </div>
        <fieldset className="rounded-lg border border-slate-800 p-3">
          <legend className="px-1 text-sm font-medium text-slate-300">Tags</legend>
          <div className="flex flex-wrap gap-3">
            {tags.length === 0 && <p className="muted">No tags have been created yet.</p>}
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  checked={values.tag_ids.includes(tag.id)}
                  onChange={(event) =>
                    update(
                      "tag_ids",
                      event.target.checked
                        ? [...values.tag_ids, tag.id]
                        : values.tag_ids.filter((id) => id !== tag.id),
                    )
                  }
                />
                {tag.name}
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 text-lg font-semibold text-white">Credits and licence</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="developer" label="Developer" error={errorFor("developer")}>
            <input
              id="developer"
              className="input"
              maxLength={120}
              value={values.developer}
              aria-invalid={Boolean(errorFor("developer"))}
              aria-describedby={describedBy("developer", errorFor("developer"))}
              onChange={(event) => update("developer", event.target.value)}
            />
          </FormField>
          <FormField id="release_year" label="Release year" error={errorFor("release_year")}>
            <input
              id="release_year"
              type="number"
              min={1980}
              max={2027}
              className="input"
              value={values.release_year}
              aria-invalid={Boolean(errorFor("release_year"))}
              aria-describedby={describedBy("release_year", errorFor("release_year"))}
              onChange={(event) => update("release_year", event.target.value)}
            />
          </FormField>
          <FormField id="license_name" label="Licence name" error={errorFor("license_name")}>
            <input
              id="license_name"
              className="input"
              value={values.license_name}
              aria-invalid={Boolean(errorFor("license_name"))}
              aria-describedby={describedBy("license_name", errorFor("license_name"))}
              onChange={(event) => update("license_name", event.target.value)}
            />
          </FormField>
          <FormField id="license_url" label="Licence URL" error={errorFor("license_url")}>
            <input
              id="license_url"
              type="url"
              className="input"
              value={values.license_url}
              aria-invalid={Boolean(errorFor("license_url"))}
              aria-describedby={describedBy("license_url", errorFor("license_url"))}
              onChange={(event) => update("license_url", event.target.value)}
            />
          </FormField>
        </div>
        <FormField id="attribution" label="Attribution">
          <textarea
            id="attribution"
            className="input min-h-16"
            value={values.attribution}
            onChange={(event) => update("attribution", event.target.value)}
          />
        </FormField>
      </fieldset>

      <fieldset className="panel space-y-4 p-5">
        <legend className="px-1 text-lg font-semibold text-white">Presentation and settings</legend>
        <FormField id="thumbnail" label="Thumbnail" error={errorFor("thumbnail")} hint="JPEG, PNG or WebP, at most 2 MB.">
          <input
            id="thumbnail"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input"
            aria-invalid={Boolean(errorFor("thumbnail"))}
            aria-describedby={describedBy("thumbnail", errorFor("thumbnail"), "JPEG, PNG or WebP, at most 2 MB.")}
            onChange={(event) => {
              setThumbnail(event.target.files?.[0] ?? null);
              setSaved(false);
            }}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField label="Featured game" checked={values.featured} onChange={(checked) => update("featured", checked)} />
          <CheckboxField
            label="Require fullscreen"
            checked={values.requireFullscreen}
            onChange={(checked) => update("requireFullscreen", checked)}
          />
          <CheckboxField
            label="Mute by default"
            checked={values.muteByDefault}
            onChange={(checked) => update("muteByDefault", checked)}
          />
          <CheckboxField label="Show FPS" checked={values.showFps} onChange={(checked) => update("showFps", checked)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="backgroundColor" label="Background colour" error={errorFor("backgroundColor")}>
            <input
              id="backgroundColor"
              className="input"
              placeholder="#0f172a"
              value={values.backgroundColor}
              aria-invalid={Boolean(errorFor("backgroundColor"))}
              aria-describedby={describedBy("backgroundColor", errorFor("backgroundColor"))}
              onChange={(event) => update("backgroundColor", event.target.value)}
            />
          </FormField>
          <FormField id="publisherId" label="Publisher ID" error={errorFor("publisherId")}>
            <input
              id="publisherId"
              className="input"
              value={values.publisherId}
              aria-invalid={Boolean(errorFor("publisherId"))}
              aria-describedby={describedBy("publisherId", errorFor("publisherId"))}
              onChange={(event) => update("publisherId", event.target.value)}
            />
          </FormField>
          <FormField id="controlsHint" label="Controls hint" error={errorFor("controlsHint")}>
            <input
              id="controlsHint"
              className="input"
              value={values.controlsHint}
              aria-invalid={Boolean(errorFor("controlsHint"))}
              aria-describedby={describedBy("controlsHint", errorFor("controlsHint"))}
              onChange={(event) => update("controlsHint", event.target.value)}
            />
          </FormField>
          <FormField id="targetScore" label="Target score" error={errorFor("targetScore")}>
            <input
              id="targetScore"
              type="number"
              min={0}
              max={100000000}
              className="input"
              value={values.targetScore}
              aria-invalid={Boolean(errorFor("targetScore"))}
              aria-describedby={describedBy("targetScore", errorFor("targetScore"))}
              onChange={(event) => update("targetScore", event.target.value)}
            />
          </FormField>
        </div>
        <FormField id="customCss" label="Custom CSS" error={errorFor("customCss")} hint="At most 4096 characters.">
          <textarea
            id="customCss"
            className="input min-h-20 font-mono text-xs"
            value={values.customCss}
            aria-invalid={Boolean(errorFor("customCss"))}
            aria-describedby={describedBy("customCss", errorFor("customCss"), "At most 4096 characters.")}
            onChange={(event) => update("customCss", event.target.value)}
          />
        </FormField>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : game ? "Save changes" : "Create draft"}
        </button>
        <Link href="/admin/games" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-800 p-3 text-sm text-slate-200">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-600 bg-slate-950"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
