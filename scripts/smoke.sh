#!/usr/bin/env bash
# Usage: bash scripts/smoke.sh [API_URL] [APP_URL] [GAME_HOST_URL]
set -euo pipefail

API="${1:-http://localhost:8400}"
APP="${2:-http://localhost:4300}"
GAME="${3:-http://127.0.0.1:8401}"

fail() { echo "smoke: FAIL - $1" >&2; exit 1; }

check() {
  local url="$1" expected="$2" label="$3"
  local code
  code=$(curl -sS -o /tmp/gameportal-smoke-body -w '%{http_code}' --max-time 10 "$url") || fail "$label request failed"
  [ "$code" = "$expected" ] || fail "$label returned $code (expected $expected): $(head -c 200 /tmp/gameportal-smoke-body)"
  echo "smoke: $label ok ($code)"
}

check "$API/api/health" 200 "api health"
check "$API/api/games?per_page=5" 200 "game discovery"
check "$API/api/categories" 200 "categories"
check "$APP/" 200 "portal home"
check "$GAME/g/does-not-exist" 404 "game host rejects unknown game"

echo "smoke: all checks passed"
