#!/usr/bin/env bash
set -euo pipefail

run_timed() {
  /usr/bin/time -p "$@"
}

PROJECT_DIR="$(run_timed realpath "$(dirname -- "${BASH_SOURCE[0]}")")"
cd "$PROJECT_DIR"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory.}"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
PLAYWRIGHT_DIR="${HOME:?}/.local/share/omgithub-playwright"

run_timed mkdir -p "$CAPTURE_DIR"
[[ -f "$RUNTIME_DIR/scripts/default-capture.mjs" ]] || { echo "Capture runtime is unavailable: $RUNTIME_DIR" >&2; exit 1; }
[[ -f "$PLAYWRIGHT_DIR/linux.json" || -f "$PLAYWRIGHT_DIR/metal.json" ]] || { echo "Browser configuration is unavailable: $PLAYWRIGHT_DIR" >&2; exit 75; }

export RUNTIME_DIR
export CAPTURE_STRICT=1
export CAPTURE_READY_SELECTOR='#title-screen'
export CAPTURE_START_SELECTOR='#btn-start-build'
run_timed node "$RUNTIME_DIR/scripts/default-capture.mjs"
