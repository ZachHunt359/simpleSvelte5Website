#!/usr/bin/env bash
# deploy.sh - POSIX-friendly deployment helper for Linux servers
set -euo pipefail

START=false
while [[ ${1:-} != "" ]]; do
  case "$1" in
    -s|--start)
      START=true; shift ;;
    -h|--help)
      echo "Usage: ./deploy.sh [--start]"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() { echo "[deploy] $*"; }

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not found in PATH. Install Node.js and retry." >&2
  exit 1
fi

# Ensure directories
mkdir -p static/panels build/logs

# Install deps
if [[ -f package-lock.json ]]; then
  log "Installing dependencies with npm ci"
  npm ci
else
  log "Installing dependencies with npm install"
  npm install
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  log "Detected DATABASE_URL. Attempting to import data/mysql_schema.sql into the target DB (if mysql CLI exists)."
  if [[ ! -f data/mysql_schema.sql ]]; then
    log "data/mysql_schema.sql not found; skipping import."
  else
    if command -v mysql >/dev/null 2>&1; then
      # Use Node to parse URL components (handles URL-encoding)
      read -r DB_HOST DB_PORT DB_USER DB_PASS DB_NAME < <(node -e '
const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url) { console.error("No DATABASE_URL"); process.exit(2); }
const host = url.hostname || "localhost";
const port = url.port || "3306";
const user = decodeURIComponent(url.username || "");
const pass = decodeURIComponent(url.password || "");
const name = (url.pathname || "").replace(/^\//, "");
console.log(host + "\n" + port + "\n" + user + "\n" + pass + "\n" + name);
') || { echo "Failed to parse DATABASE_URL with node" >&2; exit 1; }

      if [[ -z "$DB_NAME" ]]; then
        echo "DATABASE_URL is missing a database name (path). Please set DATABASE_URL to include the DB name." >&2
      else
        log "Importing schema into $DB_NAME@$DB_HOST:$DB_PORT as user '$DB_USER'"
        if [[ -n "$DB_PASS" ]]; then
          mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < data/mysql_schema.sql || echo "mysql returned non-zero exit code; import may need to be run manually"
        else
          mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < data/mysql_schema.sql || echo "mysql returned non-zero exit code; import may need to be run manually"
        fi
      fi
    else
      echo "mysql CLI not found. Please import data/mysql_schema.sql into your MySQL/MariaDB instance via your host (phpMyAdmin/console)." >&2
    fi
  fi
else
  # SQLite path
  if [[ -f data/db.db ]]; then
    bak="data/db.db.bak.$(date +%Y%m%d%H%M%S)"
    cp data/db.db "$bak"
    log "Backed up SQLite DB to $bak"
  fi
  log "Running SQLite migrations (npm run migrate)"
  npm run migrate
fi

# Regenerate panels.json and build
log "Regenerating panels.json"
npm run generate:panels

log "Building site"
npm run build

if $START; then
  log "Start requested. Attempting to start with pm2 if available."
  if command -v pm2 >/dev/null 2>&1; then
    pm2 start npm --name simplesvelte5app -- run preview
  else
    log "pm2 not found. To run the app interactively: npm run preview -- --port 3000"
  fi
fi

log "Deploy script completed successfully."
