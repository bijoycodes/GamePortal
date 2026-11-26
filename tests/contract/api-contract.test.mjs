import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Cross-stack guard: the markdown contract, Laravel routes and TypeScript types must agree.
const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const docs = read('docs/06-api-reference.md');
const routes = read('backend/routes/api.php');
const types = read('frontend/src/types/api.ts');
const backendEnv = read('backend/.env.example');
const frontendEnv = read('frontend/.env.example');

// Every documented route must be represented in the router. Parameters may be named
// differently ({id} vs {game}), so we assert on the static path segments.
const documentedRoutes = [
  ...new Set(
    [...docs.matchAll(/`[^`]*?(\/(?:api|g)\/[^`\s?]+)`/g)].map((match) => match[1])
  ),
];

assert.ok(documentedRoutes.length >= 15, 'expected the full documented route set');

for (const route of documentedRoutes) {
  const staticSegments = route
    .split('/')
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('{') && !['api', 'admin', 'g'].includes(segment));

  if (staticSegments.length === 0) {
    // /g/{slug} is a legitimate parameter-only route; assert on its prefix.
    const prefix = route.startsWith('/g/') ? '/g/' : '/api/';
    assert.ok(routes.includes(prefix), `backend/routes/api.php is missing prefix ${prefix}`);
    continue;
  }

  for (const segment of staticSegments) {
    assert.ok(
      routes.includes(segment),
      `backend/routes/api.php is missing segment "${segment}" from documented route ${route}`
    );
  }
}

// Core response fields must exist in the TS mirror and the docs that define them.
const sharedFields = [
  'player_url',
  'thumbnail_url',
  'session_token',
  'published_at',
  'last_page',
  'per_page',
  'unique_players',
  'occurred_at',
];

for (const field of sharedFields) {
  assert.ok(types.includes(field), `frontend/src/types/api.ts is missing ${field}`);
  assert.ok(docs.includes(field), `docs/06-api-reference.md is missing ${field}`);
}

// Every backend env var documented as required/defaulted must have an example entry.
const envDocs = read('docs/13-configuration.md');
const backendEnvDocs = envDocs.split('## Frontend')[0];
const documentedBackendVars = [
  ...new Set(
    [...backendEnvDocs.matchAll(/^\| `([A-Z][A-Z0-9_]+)` \| (yes|prod) \|/gm)].map(
      (match) => match[1]
    )
  ),
];
for (const variable of documentedBackendVars) {
  assert.ok(
    backendEnv.includes(`${variable}=`),
    `backend/.env.example is missing documented variable ${variable}`
  );
}

const documentedFrontendVars = [
  ...new Set(
    [...envDocs.matchAll(/^\| `((?:NEXT_PUBLIC_|AUTH_)[A-Z0-9_]+)` \| yes \|/gm)].map(
      (match) => match[1]
    )
  ),
];
for (const variable of documentedFrontendVars) {
  assert.ok(
    frontendEnv.includes(`${variable}=`),
    `frontend/.env.example is missing documented variable ${variable}`
  );
}

console.log(
  `contract: ok (${documentedRoutes.length} routes, ${sharedFields.length} shared fields, ${documentedBackendVars.length + documentedFrontendVars.length} env vars)`
);
