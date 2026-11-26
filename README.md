# GamePortal

A scalable, data-driven browser gaming portal. Players discover and play sandboxed HTML5
games; administrators manage games, categories, tags, publishing and analytics without code
changes.

**Stack:** Next.js 16 + TypeScript + Tailwind CSS 4 · Laravel 12 + PHP 8.2+ · PostgreSQL 15+ ·
Cloudflare R2 (S3-compatible) · Docker for local infrastructure.

## Quick start

```bash
docker compose -f docker/docker-compose.yml up -d postgres

cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8400
# second terminal: php artisan queue:work

cd ../frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:4300 and play the included **Star Catch** demo at
`/games/star-catch`. Seeded development admin: `admin@gameportal.test` / `password`.

GamePortal uses **web :4300, API :8400 and isolated game host :8401**. These avoid common
local Caddy bindings (`:80`, `:3000`, `:8080`–`:8083`) and PHP-FPM on `:9000`.

## Documentation

Start with [`docs/00-index.md`](docs/00-index.md). Key guides:

- [Architecture](docs/02-architecture.md)
- [Database schema](docs/05-database-schema.md)
- [API reference](docs/06-api-reference.md)
- [Game upload guidelines](docs/08-game-upload-guidelines.md)
- [Security](docs/09-security.md)
- [Development workflow](docs/11-development-workflow.md)
- [Deployment](docs/12-deployment.md)

Agents must also read [`AGENTS.md`](AGENTS.md) and [`CLAUDE.md`](CLAUDE.md) before changing code.
