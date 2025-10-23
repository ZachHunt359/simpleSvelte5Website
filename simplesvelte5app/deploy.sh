#!/usr/bin/env bash
# deploy.sh - Idempotent deployment helper for Linux servers (PM2 + adapter-node)
set -euo pipefail

# Navigate to the script's directory (the Svelte app root)
cd "$(dirname "$0")"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

APP_NAME="simplesvelte5app"
PM2_BIN="pm2"

# Options
PULL=1            # do a git pull if inside a git repo
SMOKE=1           # run a tiny smoke test after restart
NODE_MIN_ENVFILE_MAJOR=20
NODE_MIN_ENVFILE_MINOR=6

usage() {
  cat <<EOF
Usage: ./deploy.sh [--no-pull] [--no-smoke]

Performs:
  - (optional) git pull --rebase at repo root
  - MySQL schema import when DATABASE_URL is set (idempotent)
  - Ensures writable dirs: static/panels, build/logs
  - npm ci, generate panels.json, vite build
  - Restarts app with PM2, ensuring .env is loaded at runtime
  - Optional smoke test (GET /api/panels/list via localhost)

Env expectations:
  - .env file present with runtime envs (DATABASE_URL, SITE_ORIGIN, SMTP_*, BODY_SIZE_LIMIT, etc.)
  - Nginx is already configured as reverse proxy (not modified here)
EOF
}

for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    --no-smoke) SMOKE=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $arg"; usage; exit 2 ;;
  esac
done

# Ensure Node.js is installed
command -v node >/dev/null 2>&1 || die "Node.js is required but not found in PATH"

# Optionally pull latest from git
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [[ "$PULL" == "1" ]]; then
    REPO_ROOT="$(git rev-parse --show-toplevel)"
    log "Git repo detected. Pulling latest in $REPO_ROOT"
    git -C "$REPO_ROOT" fetch --all --prune
    git -C "$REPO_ROOT" pull --rebase --autostash || die "git pull failed"
  else
    log "Git repo detected. Skipping pull (--no-pull)"
  fi
else
  log "Not inside a git repo. Skipping pull."
fi

# If MySQL CLI is available and DATABASE_URL is set, import schema idempotently
if [[ -n "${DATABASE_URL:-}" ]]; then
  if command -v mysql >/dev/null 2>&1; then
    if [[ -f data/mysql_schema.sql ]]; then
      log "Detected DATABASE_URL. Checking target DB state before optional schema import."
      read -r DB_HOST DB_PORT DB_USER DB_PASS DB_NAME < <(node -e '
const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url) { process.exit(2); }
const host = url.hostname || "localhost";
const port = url.port || "3306";
const user = decodeURIComponent(url.username || "");
const pass = decodeURIComponent(url.password || "");
const name = (url.pathname || "").replace(/^\//, "");
console.log(host + "\n" + port + "\n" + user + "\n" + pass + "\n" + name);
') || die "Failed to parse DATABASE_URL with node"

      if [[ -z "$DB_NAME" ]]; then
        log "DATABASE_URL missing database name; skipping import"
      else
        # Check if AdminUsers table exists; if not, perform import (schema file contains destructive DDL)
        set +e
        if [[ -n "$DB_PASS" ]]; then
          EXISTS=$(mysql -N -B -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='AdminUsers';")
        else
          EXISTS=$(mysql -N -B -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='AdminUsers';")
        fi
        RC=$?
        set -e
        if [[ $RC -ne 0 ]]; then
          log "Failed to query information_schema; skipping automatic import"
        else
          if [[ "$EXISTS" == "0" ]]; then
            log "AdminUsers not found in ${DB_NAME}. Importing schema into $DB_NAME@$DB_HOST:$DB_PORT as '$DB_USER'"
            set +e
            if [[ -n "$DB_PASS" ]]; then
              mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < data/mysql_schema.sql
            else
              mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < data/mysql_schema.sql
            fi
            RC=$?
            set -e
            if [[ $RC -ne 0 ]]; then
              log "mysql returned exit code $RC during import; manual review may be required"
            fi
          else
            log "Database ${DB_NAME} already initialized (AdminUsers exists); skipping schema import"
          fi
        fi
      fi
    else
      log "data/mysql_schema.sql not found; skipping import"
    fi
  else
    log "mysql CLI not found; skipping schema import"
  fi
fi

# Ensure runtime-writable directories
mkdir -p static/panels build/logs

# Install dependencies
log "Installing dependencies (npm ci)"
npm ci

# Generate panels.json
log "Generating panels.json"
npm run generate:panels

# Build the app
log "Building the app"
npm run build

# Restart the server with PM2, ensuring .env is loaded at runtime
log "Restarting the server with PM2"
export PATH="$HOME/.local/bin:$PATH"

# Always use dotenv/register for PM2 (PM2 may use a different Node without --env-file support)
# Ensure dotenv is available
if ! node -e "require('dotenv');" >/dev/null 2>&1; then
  log "Installing dotenv for production runtime env loading"
  npm install dotenv --save --omit=dev
fi

export DOTENV_CONFIG_PATH="$(pwd)/.env"
NODE_ARGS="-r dotenv/config"
ENTRY="build/index.js"

set +e
$PM2_BIN delete "$APP_NAME" >/dev/null 2>&1
set -e

# Use PM2's --node-args so preloading works regardless of PM2's Node version
$PM2_BIN start "$ENTRY" --name "$APP_NAME" --node-args "$NODE_ARGS"
$PM2_BIN save

# Optional smoke test
if [[ "$SMOKE" == "1" ]]; then
  sleep 1
  PORT="${PORT:-3000}"
  log "Smoke: GET http://127.0.0.1:$PORT/api/panels/list"
  if command -v curl >/dev/null 2>&1; then
    set +e
    curl -fsS "http://127.0.0.1:$PORT/api/panels/list" >/dev/null
    RC=$?
    set -e
    if [[ $RC -eq 0 ]]; then
      log "Smoke test OK"
    else
      log "Smoke test failed (code $RC) — check PM2 logs: pm2 logs $APP_NAME"
    fi
  else
    log "curl not available; skipping smoke test"
  fi
fi

log "Deploy completed successfully."
