#!/usr/bin/env bash
# deploy.sh - Idempotent deployment helper for Linux servers (PM2 + adapter-node)
# Enhanced to support multiple environments: production, staging
set -euo pipefail

# Navigate to the script's directory (the Svelte app root)
cd "$(dirname "$0")"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

# Default values
ENV="production"      # environment: production, staging
PULL=1               # do a git pull if inside a git repo
SMOKE=1              # run a tiny smoke test after restart
NODE_MIN_ENVFILE_MAJOR=20
NODE_MIN_ENVFILE_MINOR=6

usage() {
  cat <<EOF
Usage: ./deploy.sh [--env production|staging] [--no-pull] [--no-smoke]

Enhanced deployment script supporting multiple environments.

Options:
  --env production|staging    Deploy to specified environment (default: production)
  --no-pull                  Skip git pull
  --no-smoke                 Skip smoke test after restart

Performs:
  - (optional) git pull --rebase at repo root
  - MySQL schema import when DATABASE_URL is set (idempotent)
  - Ensures writable dirs: static/panels, build/logs
  - npm ci, generate panels.json, vite build
  - Restarts app with PM2 using environment-specific config
  - Optional smoke test via localhost

Environment files:
  - .env (common settings)
  - .env.production (production overrides)
  - .env.staging (staging overrides)

PM2 Apps:
  - paranoid-comic-prod (port 3000, .env.production)
  - paranoid-comic-staging (port 3001, .env.staging)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      if [[ -n "${2:-}" ]] && [[ "$2" =~ ^(production|staging)$ ]]; then
        ENV="$2"
        shift 2
      else
        die "Invalid --env value. Use: production or staging"
      fi
      ;;
    --no-pull) PULL=0; shift ;;
    --no-smoke) SMOKE=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 2 ;;
  esac
done

# Set environment-specific variables
case "$ENV" in
  production)
    APP_NAME="paranoid-comic-prod"
    ENV_FILE=".env.production"
    PORT=3000
    ;;
  staging)
    APP_NAME="paranoid-comic-staging"
    ENV_FILE=".env.staging"
    PORT=3001
    ;;
  *)
    die "Invalid environment: $ENV"
    ;;
esac

log "Deploying to environment: $ENV"
log "PM2 app name: $APP_NAME"
log "Environment file: $ENV_FILE"
log "Port: $PORT"

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

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
  log "Warning: $ENV_FILE not found. Deployment may fail if required variables are missing."
fi

# If MySQL CLI is available and DATABASE_URL is set, import schema idempotently
# First, load the environment file to get DATABASE_URL for this environment
if [[ -f "$ENV_FILE" ]]; then
  log "Loading environment variables from $ENV_FILE"
  
  # Use ultra-robust environment loading with explicit validation
  set -a  # Enable auto-export of all variables
  
  # Create temporary files for preprocessing
  TEMP_ENV_COMMON=$(mktemp)
  TEMP_ENV_SPECIFIC=$(mktemp)
  trap 'rm -f "$TEMP_ENV_COMMON" "$TEMP_ENV_SPECIFIC"' EXIT
  
  # Load common settings first (ultra-robust preprocessing)
  if [[ -f .env ]]; then
    # Only process lines that contain '=' and aren't comments
    awk '/=/ && !/^[[:space:]]*#/ {
      gsub(/#.*$/, "");           # Remove comments
      gsub(/^[[:space:]]+/, "");  # Remove leading whitespace
      gsub(/[[:space:]]+$/, "");  # Remove trailing whitespace
      if (length($0) > 0 && index($0, "=") > 1) print
    }' .env > "$TEMP_ENV_COMMON"
    
    if [[ -s "$TEMP_ENV_COMMON" ]]; then
      source "$TEMP_ENV_COMMON"
    fi
  fi
  
  # Load environment-specific settings (overrides common settings)
  awk '/=/ && !/^[[:space:]]*#/ {
    gsub(/#.*$/, "");           # Remove comments
    gsub(/^[[:space:]]+/, "");  # Remove leading whitespace
    gsub(/[[:space:]]+$/, "");  # Remove trailing whitespace
    if (length($0) > 0 && index($0, "=") > 1) print
  }' "$ENV_FILE" > "$TEMP_ENV_SPECIFIC"
  
  if [[ -s "$TEMP_ENV_SPECIFIC" ]]; then
    source "$TEMP_ENV_SPECIFIC"
  fi
  
  set +a  # Disable auto-export
fi

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

# Ensure YouTube entries are in place (reads filesystem directly if needed)
log "Ensuring YouTube entries in _order.json"
npm run ensure-youtube

# Generate panels.json (includes YouTube entries from _order.json)
log "Generating panels.json"
npm run generate:panels

# Build the app
log "Building the app"
npm run build

# Restart the server with PM2, ensuring .env is loaded at runtime
log "Restarting the server with PM2"
export PATH="$HOME/.local/bin:$PATH"

# Restart the server with PM2 using ecosystem config
log "Restarting the server with PM2 using ecosystem.config.cjs"
export PATH="$HOME/.local/bin:$PATH"

# Set PM2 binary path
PM2_BIN="pm2"

# Ensure dotenv is available for runtime env loading
if ! node -e "require('dotenv');" >/dev/null 2>&1; then
  log "Installing dotenv for production runtime env loading (no-save)"
  npm install dotenv --no-save --omit=dev
fi

# Use ecosystem config to manage both production and staging
if [[ ! -f ecosystem.config.cjs ]]; then
  die "ecosystem.config.cjs not found. This file is required for multi-environment deployment."
fi

set +e
$PM2_BIN delete "$APP_NAME" >/dev/null 2>&1
set -e

# Start the specific app from ecosystem config
$PM2_BIN start ecosystem.config.cjs --only "$APP_NAME"
$PM2_BIN save

# Optional smoke test
if [[ "$SMOKE" == "1" ]]; then
  sleep 2  # Give the app a moment to start
  # Use a public endpoint for smoke test (no auth required)
  SMOKE_URL="http://127.0.0.1:$PORT/api/whoami"
  log "Smoke: GET $SMOKE_URL"
  if command -v curl >/dev/null 2>&1; then
    set +e
    curl -fsS "$SMOKE_URL" >/dev/null
    RC=$?
    set -e
    if [[ $RC -eq 0 ]]; then
      log "Smoke test OK for $ENV environment"
    else
      log "Smoke test failed (code $RC) — check PM2 logs: pm2 logs $APP_NAME"
    fi
  else
    log "curl not available; skipping smoke test"
  fi
fi

log "Deploy completed successfully for $ENV environment."
log "App: $APP_NAME running on port $PORT"
log "Environment file: $ENV_FILE"
log "Check status with: pm2 status $APP_NAME"
log "View logs with: pm2 logs $APP_NAME"
