# AGENTS.md — Repository-wide Agent Guidelines

Applies to every agent (Claude, Codex, OpenCode, Cursor, etc.) in this repository.

## Orientation

- Read `docs/00-index.md` before making changes.
- Treat `docs/` as the source of truth. When code and docs disagree, fix both;
  if a decision changes, add it to `docs/16-decision-log.md`.
- `CLAUDE.md` contains assistant-specific shortcuts; this file contains rules that
  apply regardless of assistant.

## Scope and style

- Work incrementally: one major feature at a time, with tests and docs in the same change.
- Keep backend (`backend/`) and frontend (`frontend/`) independently runnable.
- Use descriptive names, small classes/components, and explicit types.
- Do not duplicate constants: API routes, environment variables and status enums are
  defined once in the docs and mirrored in code.
- Never commit secrets. Use `.env.example` files and document every variable in
  `docs/13-configuration.md`.

## Security

- Admin routes require `auth:sanctum` plus the `admin` role check.
- Game hosting origin must not share cookies or credentials with the app origin.
- Validate file uploads (MIME, extension, size, path traversal, archive entries).
- Log administrative actions to `audit_logs`.
- Any change touching auth, uploads, iframe sandboxing or storage must update
  `docs/09-security.md` and include a regression test.

## Definition of done

1. Code compiles (`php artisan test`, `npm run typecheck`, `npm run test`).
2. Relevant tests pass.
3. Docs updated (index, affected docs, decision log if applicable).
4. No unresolved placeholders in changed files.
5. Final response names the files changed and the verification commands run.
