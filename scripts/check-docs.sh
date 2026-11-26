#!/usr/bin/env bash
# Fails when source code contains placeholder markers. Docs may mention them intentionally.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PATTERN='TODO|FIXME|XXX|HACK|IMPLEMENT ME|placeholder implementation|throw new Exception("not implemented'

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  FILES=$(git ls-files 'backend/**' 'frontend/**' 'docker/**' 'scripts/**' 'tests/**' 'config/**' | grep -v -E '(package-lock\.json|composer\.lock)$' || true)
else
  FILES=$(find backend frontend docker scripts tests config -type f \( -name '*.php' -o -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.json' -o -name '*.sh' -o -name '*.yml' \) 2>/dev/null || true)
fi

FOUND=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  if grep -nE "$PATTERN" "$file" >/dev/null 2>&1; then
    echo "Placeholder marker in $file:"
    grep -nE "$PATTERN" "$file" || true
    FOUND=1
  fi
done <<< "$FILES"

if [ "$FOUND" -ne 0 ]; then
  echo "check-docs: failed. Remove markers or record deliberate future work in docs/19-roadmap.md."
  exit 1
fi

echo "check-docs: no placeholder markers found in source."
