/**
 * Test-only Laravel API stand-in used by Playwright. It implements the documented
 * shapes from docs/06 so the frontend can be exercised without the backend running.
 * It is never imported by application code.
 */
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.MOCK_API_PORT ?? 8000);
const adminToken = `mock-admin-token-${randomBytes(16).toString("hex")}`;
const timestamp = "2026-01-15T10:30:00.000000Z";

const adminUser = { id: 1, name: "Test Admin", email: "admin@gameportal.test", role: "admin" };
const categories = [
  { id: 2, name: "Action", slug: "action", description: "Fast-paced games.", icon: "bolt", game_count: 2, is_active: true, sort_order: 1 },
  { id: 4, name: "Puzzle", slug: "puzzle", description: "Think before you click.", icon: "puzzle", game_count: 1, is_active: true, sort_order: 2 },
];
const tags = [
  { id: 1, name: "arcade", slug: "arcade", game_count: 2 },
  { id: 3, name: "retro", slug: "retro", game_count: 1 },
];

function makeGame(id, slug, title, overrides = {}) {
  return {
    id,
    uuid: `mock-uuid-${id}`,
    title,
    slug,
    description: `Description for ${title}.`,
    instructions: "Use the arrow keys to move.",
    category: overrides.category ?? { id: 2, name: "Action", slug: "action" },
    tags: overrides.tags ?? [tags[0]],
    thumbnail_url: `http://127.0.0.1:${port}/storage/games/${slug}.jpg`,
    status: overrides.status ?? "published",
    featured: overrides.featured ?? false,
    orientation: "landscape",
    width: 1280,
    height: 720,
    version: "1.0.0",
    developer: "Studio Example",
    release_year: 2025,
    license: { name: "MIT", url: "https://opensource.org/license/mit", attribution: "Art by Example" },
    settings: { requireFullscreen: false, backgroundColor: "#0f172a" },
    player_url: `http://127.0.0.1:8401/g/${slug}/index.html`,
    published_at: overrides.status && overrides.status !== "published" ? null : timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    entry_file: "index.html",
    deleted_at: null,
    uploads: [
      {
        id: id * 10,
        game_id: id,
        status: "published",
        original_filename: `${slug}.zip`,
        error_message: null,
        file_count: 4,
        total_size: 1024,
        processed_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    files: [{ id: id * 10, path: "index.html", mime: "text/html", size: 512, is_entry: true }],
    created_by: 1,
    updated_by: 1,
  };
}

const games = [
  makeGame(3, "neon-runner", "Neon Runner", { featured: true }),
  makeGame(4, "puzzle-boxes", "Puzzle Boxes", { category: categories[1], tags: [tags[1]] }),
  makeGame(5, "retro-racer", "Retro Racer", { featured: true, tags: [tags[0], tags[1]] }),
  makeGame(6, "space-cadet", "Space Cadet"),
  makeGame(7, "tile-tumble", "Tile Tumble", { category: categories[1] }),
  makeGame(8, "draft-demo", "Draft Demo", { status: "draft", featured: false }),
];

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function field(raw, name) {
  const match = new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(raw ?? "");
  return match ? match[1].trim() : "";
}

function send(response, status, body, headers = {}) {
  const base = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "X-Request-Id": "mock-request-id",
    ...headers,
  };
  response.writeHead(status, base);
  response.end(body === undefined || status === 204 ? "" : JSON.stringify(body));
}

function paginate(items, search) {
  const page = Math.max(1, Number(search.get("page") ?? 1) || 1);
  const perPage = Math.min(50, Math.max(1, Number(search.get("per_page") ?? 12) || 12));
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: page,
      from: items.length > 0 ? start + 1 : null,
      last_page: Math.max(1, Math.ceil(items.length / perPage)),
      per_page: perPage,
      total: items.length,
    },
  };
}

function listGames(search, includeAll = false) {
  let items = games.filter((game) => includeAll || game.status === "published");
  const query = (search.get("q") ?? "").toLowerCase();
  if (query) {
    items = items.filter((game) =>
      [game.title, game.description, game.developer].some((value) => value?.toLowerCase().includes(query)),
    );
  }
  const category = search.get("category");
  if (category) {
    items = items.filter((game) => game.category?.slug === category || String(game.category?.id) === category);
  }
  const tag = search.get("tag");
  if (tag) items = items.filter((game) => game.tags.some((item) => item.slug === tag));
  const status = search.get("status");
  if (status) items = items.filter((game) => game.status === status);

  const sort = search.get("sort");
  if (sort === "title") items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "newest") items = [...items].reverse();
  return paginate(items, search);
}

function analytics(days) {
  const timeseries = Array.from({ length: days }, (_, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, "0")}`,
    plays: (index * 7) % 23,
  }));
  return {
    plays: 128,
    unique_players: 94,
    sessions: 140,
    avg_duration_seconds: 185,
    timeseries,
    top_games: [
      { id: 3, title: "Neon Runner", plays: 64 },
      { id: 5, title: "Retro Racer", plays: 41 },
    ],
  };
}

function authorised(request) {
  return request.headers.authorization === `Bearer ${adminToken}`;
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const body = ["POST", "PUT", "PATCH"].includes(request.method) ? await readBody(request) : {};

  if (url.pathname === "/api/health") return send(response, 200, { status: "ok", version: "1.0.0" });

  if (parts[0] === "api" && parts[1] === "games") {
    if (parts.length === 2 && request.method === "GET") return send(response, 200, listGames(url.searchParams));
    if (parts.length === 3 && request.method === "GET") {
      const game = games.find((item) => item.slug === parts[2] && item.status === "published");
      return game ? send(response, 200, game) : send(response, 404, { message: "Game not found." });
    }
    if (parts.length === 4 && parts[3] === "sessions" && request.method === "POST") {
      return send(response, 201, { id: 12, session_token: randomBytes(48).toString("base64url"), started_at: timestamp });
    }
  }

  if (parts[0] === "api" && parts[1] === "sessions" && parts.length >= 3) {
    if (parts.length === 3 && request.method === "PATCH") {
      return send(response, 200, {
        id: 12,
        game_id: 3,
        session_token: parts[2],
        started_at: timestamp,
        ended_at: body.ended_at ?? timestamp,
        duration_seconds: body.duration_seconds ?? 0,
        referrer: "127.0.0.1:4300",
      });
    }
    if (parts[3] === "events" && request.method === "POST") {
      return send(response, 201, { id: 99, type: body.type ?? "custom", occurred_at: body.occurred_at ?? timestamp });
    }
  }

  if (parts[0] === "api" && parts[1] === "categories") {
    if (parts.length === 2) return send(response, 200, paginate(categories, url.searchParams));
    const category = categories.find((item) => item.slug === parts[2]);
    return category ? send(response, 200, category) : send(response, 404, { message: "Category not found." });
  }
  if (parts[0] === "api" && parts[1] === "tags" && parts.length === 2) {
    return send(response, 200, paginate(tags, url.searchParams));
  }

  if (parts[0] === "api" && parts[1] === "admin") {
    if (parts[2] === "login" && request.method === "POST") {
      if (body.email === "admin@gameportal.test" && body.password === "password") {
        return send(response, 200, { token: adminToken, user: adminUser });
      }
      return send(response, 401, { message: "These credentials do not match our records." });
    }

    if (!authorised(request)) {
      return send(response, 401, { message: "Unauthenticated.", code: "UNAUTHENTICATED" });
    }

    if (parts[2] === "logout") return send(response, 204);
    if (parts[2] === "me") return send(response, 200, adminUser);

    if (parts[2] === "games") {
      if (parts.length === 3 && request.method === "GET") return send(response, 200, listGames(url.searchParams, true));
      if (parts.length === 3 && request.method === "POST") {
        const title = field(body.raw, "title") || "Untitled game";
        const slug = field(body.raw, "slug") || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const game = makeGame(games.length + 90, slug, title, { status: "draft" });
        games.push(game);
        return send(response, 201, game);
      }
      const game = games.find((item) => String(item.id) === parts[3]);
      if (!game) return send(response, 404, { message: "Game not found." });
      if (parts.length === 4 && request.method === "GET") return send(response, 200, game);
      if (parts.length === 4 && ["PUT", "PATCH"].includes(request.method)) {
        if (body.raw) {
          const title = field(body.raw, "title");
          if (title) game.title = title;
        }
        return send(response, 200, game);
      }
      if (parts.length === 4 && request.method === "DELETE") {
        game.status = "archived";
        return send(response, 204);
      }
      if (parts.length === 5 && ["publish", "disable", "archive"].includes(parts[4])) {
        game.status = parts[4] === "publish" ? "published" : parts[4] === "disable" ? "disabled" : "archived";
        game.published_at = game.status === "published" ? timestamp : game.published_at;
        return send(response, 200, { message: `Game ${parts[4]}ed.`, data: game });
      }
      if (parts.length === 5 && parts[4] === "upload") {
        return send(response, 202, {
          message: "Upload queued for processing.",
          data: { id: 7, game_id: game.id, status: "pending", original_filename: "game.zip" },
        });
      }
    }

    if (parts[2] === "uploads" && request.method === "DELETE") return send(response, 204);

    if (parts[2] === "categories") {
      if (parts.length === 3 && request.method === "GET") return send(response, 200, paginate(categories, url.searchParams));
      if (parts[3] === undefined) return send(response, 201, { id: 9, ...body });
      return send(response, request.method === "DELETE" ? 204 : 200, { id: Number(parts[3]), ...body });
    }
    if (parts[2] === "tags") {
      if (parts.length === 3 && request.method === "GET") return send(response, 200, paginate(tags, url.searchParams));
      if (parts[3] === undefined) return send(response, 201, { id: 9, ...body });
      return send(response, request.method === "DELETE" ? 204 : 200, { id: Number(parts[3]), ...body });
    }
    if (parts[2] === "analytics") {
      const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30) || 30));
      if (parts[3] === "overview") return send(response, 200, analytics(days));
      if (parts[3] === "games" && parts[4]) {
        return send(response, 200, {
          game: { id: Number(parts[4]), name: games.find((item) => String(item.id) === parts[4])?.title ?? "Game", slug: "game" },
          ...analytics(days),
          recent_events: [{ id: 1, type: "score", metadata: { score: 1250 }, occurred_at: timestamp }],
        });
      }
    }
    if (parts[2] === "audit-logs") {
      return send(response, 200, paginate(
        [{ id: 1, user_id: 1, action: "game.published", subject_type: "App\\Models\\Game", subject_id: 3, metadata: {}, ip: "127.0.0.1", user_agent: "test", created_at: timestamp }],
        url.searchParams,
      ));
    }
  }

  return send(response, 404, { message: `Mock API has no route for ${request.method} ${url.pathname}.` });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock API listening on http://127.0.0.1:${port}`);
});
