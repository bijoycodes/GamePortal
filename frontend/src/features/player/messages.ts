import type { EventType, GameEventRequest, JsonObject, JsonValue } from "@/types/api";

export const GAME_MESSAGE_SOURCE = "gameportal";
export const MAX_METADATA_BYTES = 8192;

const ALLOWED_EVENTS: readonly EventType[] = ["start", "end", "score", "level_complete", "custom"];
const MAX_KEYS = 40;
const MAX_DEPTH = 3;
const MAX_STRING_LENGTH = 2048;
const MAX_KEY_LENGTH = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only messages from the exact embedded frame are accepted (docs/07). */
export function isValidGameMessageEvent(event: MessageEvent, iframe: HTMLIFrameElement | null): boolean {
  return Boolean(iframe && iframe.contentWindow && event.source === iframe.contentWindow);
}

function sanitizeValue(value: unknown, depth: number): JsonValue | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (depth >= MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_KEYS).map((item) => sanitizeValue(item, depth + 1) ?? null);
  }
  if (isRecord(value)) return sanitizeObject(value, depth + 1);
  return undefined;
}

function sanitizeObject(value: Record<string, unknown>, depth = 0): JsonObject {
  const result: JsonObject = {};
  for (const [key, rawValue] of Object.entries(value).slice(0, MAX_KEYS)) {
    if (key.length > MAX_KEY_LENGTH) continue;
    const sanitized = sanitizeValue(rawValue, depth);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).length;
  return value.length;
}

/**
 * Validates a game postMessage and converts it to the documented event body.
 * Untrusted sources, unknown events, malformed scores and oversized metadata are dropped.
 */
export function parseGameMessage(
  data: unknown,
  occurredAt: string = new Date().toISOString(),
): GameEventRequest | null {
  if (!isRecord(data)) return null;
  if (data.source !== GAME_MESSAGE_SOURCE) return null;
  if (typeof data.event !== "string") return null;

  const type = ALLOWED_EVENTS.find((allowed) => allowed === data.event);
  if (!type) return null;

  let metadata: JsonObject = {};
  if (type === "score" || type === "level_complete") {
    const source = isRecord(data.metadata) ? data.metadata : data;
    const field = type === "score" ? source.score : source.level;
    if (typeof field !== "number" || !Number.isFinite(field)) return null;
    metadata = type === "score" ? { score: field } : { level: field };
  } else if (isRecord(data.metadata)) {
    metadata = sanitizeObject(data.metadata);
  }

  const serialised = JSON.stringify(metadata);
  if (byteLength(serialised) > MAX_METADATA_BYTES) return null;

  return { type, metadata, occurred_at: occurredAt };
}
