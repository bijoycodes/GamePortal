import type { AdminGame, GameResource } from "@/types/api";

const base = {
  id: 3,
  uuid: "9f1c-test-uuid",
  title: "Neon Runner",
  slug: "neon-runner",
  description: "A fast endless runner through a neon city.",
  instructions: "Use the arrow keys to move.",
  category: { id: 2, name: "Action", slug: "action" },
  tags: [{ id: 1, name: "arcade", slug: "arcade" }],
  thumbnail_url: "http://localhost:8400/storage/games/thumb.jpg",
  status: "published",
  featured: true,
  orientation: "landscape",
  width: 1280,
  height: 720,
  version: "1.0.0",
  developer: "Studio Example",
  release_year: 2025,
  license: { name: "MIT", url: "https://opensource.org/license/mit", attribution: "Art by Example" },
  settings: { requireFullscreen: false },
  player_url: "http://127.0.0.1:8401/g/neon-runner/index.html",
  published_at: "2026-01-15T10:30:00.000000Z",
  created_at: "2026-01-10T10:30:00.000000Z",
  updated_at: "2026-01-15T10:30:00.000000Z",
} satisfies GameResource;

export const gameFixture: GameResource = base;

export const adminGameFixture: AdminGame = {
  ...base,
  entry_file: "index.html",
  deleted_at: null,
  created_by: 1,
  updated_by: 1,
  uploads: [],
  files: [],
};

export function gameFixtureWith(overrides: Partial<GameResource>): GameResource {
  return { ...base, ...overrides };
}
