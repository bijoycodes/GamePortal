#!/usr/bin/env bash
# Generates a minimal, self-contained HTML5 game ZIP for local upload testing.
# Usage: bash scripts/make-sample-game.sh [output.zip]
set -euo pipefail

OUT="${1:-/tmp/gameportal-sample-game.zip}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/index.html" <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Orbit Tap</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main>
    <h1>Orbit Tap</h1>
    <p>Tap the circle. Score: <span id="score">0</span></p>
    <button id="target" type="button" aria-label="Tap the circle"></button>
  </main>
  <script src="game.js"></script>
</body>
</html>
HTML

cat > "$TMP/styles.css" <<'CSS'
:root { color-scheme: dark; font-family: system-ui, sans-serif; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #e2e8f0; }
main { text-align: center; }
#target { width: 120px; height: 120px; border-radius: 50%; border: 0; background: #38bdf8; cursor: pointer; box-shadow: 0 0 40px #38bdf855; }
CSS

cat > "$TMP/game.js" <<'JS'
(() => {
  const target = document.getElementById('target');
  const output = document.getElementById('score');
  let score = 0;
  target.addEventListener('click', () => {
    score += 1;
    output.textContent = String(score);
    parent.postMessage({ source: 'gameportal', event: 'score', score }, '*');
  });
  parent.postMessage({ source: 'gameportal', event: 'ready' }, '*');
})();
JS

(cd "$TMP" && zip -q -r "$OUT" .)
echo "Created $OUT"
