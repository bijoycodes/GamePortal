import { describe, expect, it } from "vitest";
import {
  clamp,
  formatBytes,
  formatDate,
  formatDuration,
  formatNumber,
  formatRelativeTime,
  isHexColor,
  isValidHttpUrl,
  isValidSlug,
  sanitizeReferrerHost,
  slugify,
  truncate,
} from "./format";

describe("format helpers", () => {
  it("formats dates consistently in UTC", () => {
    expect(formatDate("2026-01-15T10:30:00.000000Z")).toBe("Jan 15, 2026");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date", "Missing")).toBe("Missing");
  });

  it("formats relative time against an injected clock", () => {
    const now = new Date("2026-01-15T12:00:00.000Z");
    expect(formatRelativeTime("2026-01-15T11:59:30.000Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-01-15T09:00:00.000Z", now)).toBe("3 hours ago");
    expect(formatRelativeTime(null, now)).toBe("unknown");
  });

  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(90.8)).toBe("1m 30s");
    expect(formatDuration(3665)).toBe("1h 1m");
    expect(formatDuration(null)).toBe("—");
  });

  it("formats bytes and numbers", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2 MB");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("creates and validates slugs", () => {
    expect(slugify("  Héllo World!  ")).toBe("hello-world");
    expect(isValidSlug("neon-runner")).toBe(true);
    expect(isValidSlug("Neon Runner")).toBe(false);
    expect(isValidSlug("-neon")).toBe(false);
  });

  it("validates URLs and colours", () => {
    expect(isValidHttpUrl("https://example.com/licence")).toBe(true);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("not a url")).toBe(false);
    expect(isHexColor("#0f172a")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
  });

  it("truncates text and clamps numbers", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
    expect(clamp(99, 1, 50)).toBe(50);
    expect(clamp(-2, 1, 50)).toBe(1);
  });

  it("reduces a referrer to its host only", () => {
    expect(sanitizeReferrerHost("https://example.com/some/path?q=1")).toBe("example.com");
    expect(sanitizeReferrerHost("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeReferrerHost(null)).toBeUndefined();
  });
});
