#!/usr/bin/env bash
set -euo pipefail

run_timed() {
  /usr/bin/time -p "$@"
}

SCRIPT_PATH="$(run_timed realpath "${BASH_SOURCE[0]}")"
PROJECT_DIR="${SCRIPT_PATH%/*}"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT > 0 && PORT < 65536 )) || { echo "Invalid PORT: $PORT" >&2; exit 1; }

STATIC_DIR="$PROJECT_DIR"
if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    run_timed npm ci --no-audit --no-fund
  else
    run_timed npm install --no-audit --no-fund
  fi
  if run_timed node -e 'const p=require(process.argv[1]); process.exit(p.scripts?.build ? 0 : 1)' "$PROJECT_DIR/package.json"; then
    run_timed npm run build
    STATIC_DIR="$PROJECT_DIR/dist"
  fi
fi

[[ -f "$STATIC_DIR/index.html" ]] || { echo "Static directory has no index.html: $STATIC_DIR" >&2; exit 1; }
case "$STATIC_DIR" in
  "$PROJECT_DIR"|"$PROJECT_DIR"/*) ;;
  *) echo "Built output must stay inside the project directory: $STATIC_DIR" >&2; exit 1 ;;
esac

WEB_META_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
run_timed mkdir -p "$WEB_META_DIR"
PROJECT_DIR="$PROJECT_DIR" STATIC_DIR="$STATIC_DIR" run_timed python3 -c 'import json, os; p=os.environ["PROJECT_DIR"]; d=os.path.realpath(os.environ["STATIC_DIR"]); out="/home/runner/work/_temp/omgithub-web/deployment-output.json"; json.dump({"project":p,"directory":d}, open(out,"w"))'
export PORT
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$STATIC_DIR"
