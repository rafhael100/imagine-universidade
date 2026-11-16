#!/usr/bin/env bash
set -euo pipefail
# OFFLINE visual review only: no authenticated Portal, public server or customer data.
test "${GITHUB_ACTIONS:-}" = "true" || { echo "FAIL: browser QA is CI-only." >&2; exit 2; }
test ! -e .env
test ! -e .env.production
test -f preview/current.html
test -f preview/logo-imagine.png

BROWSER=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$(command -v "$candidate")"
    break
  fi
done
test -n "$BROWSER" || { echo "FAIL: Chrome/Chromium unavailable on runner." >&2; exit 2; }

ROOT="$(pwd)"
URL="file://${ROOT}/preview/current.html"
OUT="$ROOT/preview/.qa-shots"
mkdir -p "$OUT"
TEMP_PROFILE="$(mktemp -d)"
trap 'rm -rf "$TEMP_PROFILE"' EXIT

timeout 35s "$BROWSER" --headless=new --no-sandbox \
  --disable-gpu --disable-dev-shm-usage --disable-background-networking \
  --no-first-run --no-default-browser-check --disable-extensions \
  --user-data-dir="$TEMP_PROFILE/dom" --virtual-time-budget=3000 \
  --dump-dom "$URL" >"$TEMP_PROFILE/dom.html" 2>"$TEMP_PROFILE/browser.log"
COURSES="$(grep -o 'class="course"' "$TEMP_PROFILE/dom.html" | wc -l || true)"
if [[ "$COURSES" != "10" ]]; then
  echo "FAIL: expected 10 rendered courses, found $COURSES" >&2
  exit 1
fi

for WIDTH in 360 768 1440; do
  timeout 35s "$BROWSER" --headless=new --no-sandbox \
    --disable-gpu --disable-dev-shm-usage --disable-background-networking \
    --no-first-run --no-default-browser-check --disable-extensions \
    --hide-scrollbars --force-device-scale-factor=1 \
    --user-data-dir="$TEMP_PROFILE/profile-$WIDTH" \
    --window-size="${WIDTH},900" --virtual-time-budget=2500 \
    --screenshot="$OUT/uni-offline-${WIDTH}.png" "$URL" \
    >/dev/null 2>"$TEMP_PROFILE/browser-$WIDTH.log"
  test -s "$OUT/uni-offline-${WIDTH}.png" || {
    echo "FAIL: missing screenshot for requested width $WIDTH." >&2
    exit 1
  }
  echo "PASS: offline synthetic screenshot for requested ${WIDTH}px viewport."
done
echo "PASS: Chrome/Chromium executed 10 rendered courses and generated three offline screenshots."
echo "Not Laravel staging or accessibility signoff."
