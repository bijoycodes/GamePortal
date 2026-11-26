# 19 — Roadmap (deliberate future work)

These are consciously deferred, not unfinished placeholders in code. Each item needs its own
phase, docs update and decision log entry before implementation.

| Priority | Item | Rationale | Owner |
|----------|------|-----------|-------|
| P1 | Antivirus scanning of uploaded ZIPs | Requires external service/queue integration; v1 relies on strict validation | Platform |
| P1 | CDN cache purge API on publish/replace | Ties deployment to a CDN provider; manual purge documented today | Platform |
| P2 | User accounts and favourites | Needs auth UX and privacy review; anonymous play works now | Product |
| P2 | Leaderboards built from `score` events | Event capture exists; ranking/anti-cheat design pending | Product |
| P2 | Revalidation webhook from admin to Next.js | ISR 60s is acceptable for v1; webhook needs signed auth | Platform |
| P3 | Playwright full admin E2E (publish flow) | Deferred to phase 7 build order | QA |
| P3 | Multi-tenant portals | Explicit non-goal; would require schema and auth redesign | Product |
| P3 | Native PostgreSQL enum migration | Only if state changes become frequent (DR-006) | Platform |

Items are never silently started; move them into `docs/00-index.md` status table when work begins.
