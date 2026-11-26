#!/usr/bin/env bash
# Packages the Star Catch HTML5 game for upload through the admin API.
# Usage: bash scripts/make-star-catch.sh [output.zip]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-/tmp/gameportal-star-catch.zip}"
SOURCE="$ROOT/assets/games/star-catch/index.html"

[ -f "$SOURCE" ] || { echo "missing game source: $SOURCE" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$SOURCE" "$TMP/index.html"
(cd "$TMP" && zip -q -r "$OUT" .)
echo "Created $OUT"
