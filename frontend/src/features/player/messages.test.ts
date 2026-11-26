import { describe, expect, it } from "vitest";
import { isValidGameMessageEvent, parseGameMessage } from "./messages";

describe("parseGameMessage", () => {
  it("accepts an allowed score message with numeric metadata", () => {
    const result = parseGameMessage(
      { source: "gameportal", event: "score", score: 1250 },
      "2026-01-15T10:31:00.000Z",
    );
    expect(result).toEqual({
      type: "score",
      metadata: { score: 1250 },
      occurred_at: "2026-01-15T10:31:00.000Z",
    });
  });

  it("accepts level completion and custom metadata", () => {
    expect(parseGameMessage({ source: "gameportal", event: "level_complete", level: 4 })?.metadata).toEqual({ level: 4 });
    expect(
      parseGameMessage({ source: "gameportal", event: "custom", metadata: { note: "hello", nested: { ok: true } } })
        ?.metadata,
    ).toEqual({ note: "hello", nested: { ok: true } });
  });

  it("rejects foreign sources, unknown events and malformed payloads", () => {
    expect(parseGameMessage({ source: "other", event: "score", score: 5 })).toBeNull();
    expect(parseGameMessage({ source: "gameportal", event: "navigate", url: "https://evil.test" })).toBeNull();
    expect(parseGameMessage({ source: "gameportal", event: "score", score: "1250" })).toBeNull();
    expect(parseGameMessage(null)).toBeNull();
    expect(parseGameMessage({ source: "gameportal", event: "custom", metadata: [] })).toEqual({
      type: "custom",
      metadata: {},
      occurred_at: expect.any(String),
    });
  });

  it("rejects metadata larger than 8192 bytes", () => {
    const metadata: Record<string, string> = {};
    for (let index = 0; index < 40; index += 1) {
      metadata[`key-${index}`] = "x".repeat(500);
    }
    expect(parseGameMessage({ source: "gameportal", event: "custom", metadata })).toBeNull();
  });
});

describe("isValidGameMessageEvent", () => {
  it("accepts only messages from the embedded iframe window", () => {
    const iframe = { contentWindow: { id: "frame" } } as unknown as HTMLIFrameElement;
    const otherWindow = { id: "other" };

    expect(
      isValidGameMessageEvent({ source: iframe.contentWindow } as unknown as MessageEvent, iframe),
    ).toBe(true);
    expect(isValidGameMessageEvent({ source: otherWindow } as unknown as MessageEvent, iframe)).toBe(false);
    expect(isValidGameMessageEvent({ source: iframe.contentWindow } as unknown as MessageEvent, null)).toBe(false);
  });
});
