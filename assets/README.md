# Assets policy

- `frontend/public/` contains only static first-party assets (favicon, logo, og-image).
- Uploaded game files and thumbnails live in object storage; never in the repository.
- Documentation screenshots belong in `assets/docs/` and should be compressed WebP/PNG.
- Brand source files (SVG) may live in `assets/brand/`; exported icons go to `frontend/public/`.
- Do not commit third-party game artwork unless `docs/06-api-reference.md` metadata includes
  its licence/attribution path.
