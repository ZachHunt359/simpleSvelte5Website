#!/usr/bin/env bash
# deploy.sh - POSIX-friendly deployment helper for Linux servers
set -euo pipefail

# Navigate to the script's directory
cd "$(dirname "$0")"

log() { echo "[deploy] $*"; }

# Ensure Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not found in PATH. Install Node.js and retry." >&2
  exit 1
fi

# Ensure MySQL is installed
if ! command -v mysql >/dev/null 2>&1; then
  echo "MySQL CLI is required but not found in PATH. Install MySQL and retry." >&2
  exit 1
fi

# Check and populate MySQL database
if [[ -n "${DATABASE_URL:-}" ]]; then
  log "Detected DATABASE_URL. Attempting to import data/mysql_schema.sql into the target DB."
  if [[ ! -f data/mysql_schema.sql ]]; then
    log "data/mysql_schema.sql not found; skipping import."
  else
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
  fi
fi

# Apply migrations
log "Applying database migrations"
node scripts/apply-migrations.js

# Install dependencies
log "Installing dependencies"
npm ci

# Generate panels.json
log "Generating panels.json"
npm run generate:panels

# Build the app
log "Building the app"
npm run build

# Restart the server with pm2
log "Restarting the server with pm2"
export PATH="$HOME/.local/bin:$PATH"
pm2 restart simplesvelte5app --update-env || pm2 start ecosystem.config.cjs --env production
pm2 save

log "Deploy script completed successfully."
