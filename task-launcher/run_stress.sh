#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5173}"
HOST="http://localhost:${PORT}"
ROUTE="/test-insufficient-resources"

TOTAL="${TOTAL:-8000}"
CONCURRENCY="${CONCURRENCY:-192}"
MODE="${MODE:-fetchAndDecode}"
WIDTH="${WIDTH:-384}"
HEIGHT="${HEIGHT:-384}"
WAVE_DELAY_MS="${WAVE_DELAY_MS:-0}"
STOP_ON_FIRST_ERROR="${STOP_ON_FIRST_ERROR:-false}"

URL="${HOST}${ROUTE}?total=${TOTAL}&concurrency=${CONCURRENCY}&mode=${MODE}&w=${WIDTH}&h=${HEIGHT}&delay=${WAVE_DELAY_MS}&stopOnFirstError=${STOP_ON_FIRST_ERROR}"

CHROME_BIN="${CHROME_BIN:-}"
if [[ -z "${CHROME_BIN}" ]]; then
  if command -v google-chrome >/dev/null 2>&1; then CHROME_BIN="google-chrome";
  elif command -v chrome >/dev/null 2>&1; then CHROME_BIN="chrome";
  elif command -v chromium-browser >/dev/null 2>&1; then CHROME_BIN="chromium-browser";
  elif command -v chromium >/dev/null 2>&1; then CHROME_BIN="chromium";
  else echo "Chrome/Chromium not found; set CHROME_BIN=/path/to/chrome" >&2; exit 1; fi
fi

cd "$(dirname "$0")/stress-harness"

if [[ ! -d node_modules ]]; then
  echo "[+] Installing dependencies..."; npm install
fi

echo "[+] Starting Vite dev server on port ${PORT}..."
npx vite dev --port "${PORT}" --strictPort --clearScreen=false >/tmp/vite-${PORT}.log 2>&1 &
VITE_PID=$!
trap 'kill ${VITE_PID} >/dev/null 2>&1 || true' EXIT

echo "[+] Waiting for dev server..."
for i in {1..60}; do curl -fsS "${HOST}" >/dev/null 2>&1 && break; sleep 0.5; done

TMP_PROFILE="$(mktemp -d)"
echo "[+] Launching Chrome to ${URL}"
"${CHROME_BIN}" \
  --new-window \
  --user-data-dir="${TMP_PROFILE}" \
  --no-first-run \
  --disable-extensions \
  --disable-default-apps \
  --disable-dev-shm-usage \
  --disable-gpu \
  --disk-cache-size=1 \
  --media-cache-size=1 \
  --disable-features=NetworkServiceSandbox \
  --disable-background-networking \
  --aggressive-cache-discard \
  --enable-features=NetworkService,NetworkServiceInProcess \
  --remote-debugging-port=9222 \
  "${URL}" &

wait ${VITE_PID}


