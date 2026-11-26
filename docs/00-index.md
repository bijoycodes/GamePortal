# GamePortal Documentation Index

This index is the map of the repository. Start here, then follow the link for the area you
need. Implementation status is tracked in the table at the bottom.

## Documentation

| # | Document | Purpose |
|---|----------|---------|
| 00 | [This index](00-index.md) | Navigation and build status |
| 01 | [Requirements and scope](01-requirements-and-scope.md) | Product requirements, personas, non-goals |
| 02 | [Architecture](02-architecture.md) | Stack, boundaries, runtime topology, trust zones |
| 03 | [System design](03-system-design.md) | Request flows, upload pipeline, caching, scaling |
| 04 | [Folder structure](04-folder-structure.md) | Where every file belongs |
| 05 | [Database schema](05-database-schema.md) | Tables, columns, indexes, constraints |
| 06 | [API reference](06-api-reference.md) | Public/admin/game-host HTTP contract |
| 07 | [Game integration](07-game-integration.md) | How an HTML5 game is wrapped and loaded |
| 08 | [Upload guidelines](08-game-upload-guidelines.md) | Package rules, validation, publishing |
| 09 | [Security](09-security.md) | Threat model and required controls |
| 10 | [Testing](10-testing.md) | Test strategy, fixtures, commands |
| 11 | [Development workflow](11-development-workflow.md) | Incremental build order and conventions |
| 12 | [Deployment](12-deployment.md) | Local, staging, production runbooks |
| 13 | [Configuration](13-configuration.md) | Every env var and config file |
| 14 | [Dependencies](14-dependencies.md) | Dependency inventory and rationale |
| 15 | [Analytics](15-analytics.md) | Events, metrics, retention, privacy |
| 16 | [Decision log](16-decision-log.md) | Architectural decisions and trade-offs |
| 17 | [Troubleshooting](17-troubleshooting.md) | Common failures and fixes |
| 18 | [Operations runbook](18-operations-runbook.md) | Day-2 operations: publish, disable, rollback |
| 19 | [Roadmap](19-roadmap.md) | Deliberate future work (no placeholders in code) |
| 20 | [Final implementation report](20-implementation-report.md) | What was built, verification, setup, deployment, limitations |

## Repository layout at a glance

```
gameplatform/
├── CLAUDE.md, AGENTS.md, README.md
├── docs/                 # this directory
├── backend/              # Laravel API, admin data, storage adapters, queues
├── frontend/             # Next.js player portal + admin UI
├── docker/               # local services and container definitions
├── scripts/              # developer and deployment helpers
├── config/               # shared static configuration (templates, policies)
├── assets/               # documentation/screenshots/brand references
├── tests/                # cross-stack contract and smoke checks
└── logs/                 # local runtime logs (gitignored)
```

Detailed tree: [docs/04-folder-structure.md](04-folder-structure.md).

## Implementation status

Legend: `done` | `in progress` | `planned` | `deferred`.

| Area | Status | Verified by |
|------|--------|-------------|
| Documentation foundation | done | this file |
| Laravel project skeleton and config | done | `php artisan test` |
| Database migrations, models, seeders | done | `php artisan test` |
| Public discovery API (games, categories, tags) | done | `php artisan test` |
| Admin CRUD + auth + audit log | done | `php artisan test` |
| Upload pipeline + sandboxed game host | done | `php artisan test` |
| Analytics ingestion + dashboard API | done | `php artisan test` |
| Next.js portal (discovery, search, player) | done | `npm run typecheck`, `npm run test`, `npm run build`, `npm run e2e` |
| Next.js admin dashboard | done | `npm run typecheck`, `npm run test`, `npm run build`, `npm run e2e` |
| Docker/local environment | in progress | compose files written; Docker unavailable on the build machine, so `docker compose up -d` was not executed here |
| CI, deployment manifests, runbooks | in progress | `.github/workflows/ci.yml` written; local equivalents pass, GitHub Actions run pending |

Update this table whenever an area changes. Do not mark `done` without a passing
verification command.
