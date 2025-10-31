#!/usr/bin/env bash
# server-manage.sh - Management script for production and staging environments
set -euo pipefail

cd "$(dirname "$0")"

log() { echo "[server-manage] $*"; }
die() { echo "[server-manage] ERROR: $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: ./server-manage.sh <command> [environment]

Commands:
  status [prod|staging|all]     - Show PM2 status
  logs [prod|staging]          - Follow logs
  restart [prod|staging|all]   - Restart application(s)
  stop [prod|staging|all]      - Stop application(s)
  deploy [prod|staging]        - Deploy to environment
  setup-staging                - Initial staging environment setup
  nginx-test                   - Test nginx configuration
  nginx-reload                 - Reload nginx configuration
  ssl-renew                    - Renew SSL certificates

Environment:
  prod     - Production (paranoid-comic-prod, port 3000)
  staging  - Staging (paranoid-comic-staging, port 3001)
  all      - Both environments (default for some commands)

Examples:
  ./server-manage.sh status
  ./server-manage.sh logs prod
  ./server-manage.sh deploy staging
  ./server-manage.sh restart all
EOF
}

get_app_name() {
  local env="$1"
  case "$env" in
    prod|production) echo "paranoid-comic-prod" ;;
    staging) echo "paranoid-comic-staging" ;;
    *) die "Invalid environment: $env. Use 'prod' or 'staging'" ;;
  esac
}

cmd_status() {
  local env="${1:-all}"
  if [[ "$env" == "all" ]]; then
    log "PM2 Status (All Apps):"
    pm2 status
  else
    local app_name=$(get_app_name "$env")
    log "PM2 Status ($env):"
    pm2 status "$app_name"
  fi
}

cmd_logs() {
  local env="${1:-prod}"
  local app_name=$(get_app_name "$env")
  log "Following logs for $env ($app_name):"
  pm2 logs "$app_name" --lines 50
}

cmd_restart() {
  local env="${1:-all}"
  if [[ "$env" == "all" ]]; then
    log "Restarting all applications:"
    pm2 restart paranoid-comic-prod paranoid-comic-staging
  else
    local app_name=$(get_app_name "$env")
    log "Restarting $env ($app_name):"
    pm2 restart "$app_name"
  fi
  pm2 save
}

cmd_stop() {
  local env="${1:-all}"
  if [[ "$env" == "all" ]]; then
    log "Stopping all applications:"
    pm2 stop paranoid-comic-prod paranoid-comic-staging
  else
    local app_name=$(get_app_name "$env")
    log "Stopping $env ($app_name):"
    pm2 stop "$app_name"
  fi
}

cmd_deploy() {
  local env="${1:-prod}"
  case "$env" in
    prod|production)
      log "Deploying to production:"
      ./deploy.sh --env production
      ;;
    staging)
      log "Deploying to staging:"
      ./deploy.sh --env staging
      ;;
    *)
      die "Deploy requires specific environment: prod or staging"
      ;;
  esac
}

cmd_setup_staging() {
  log "Setting up staging environment..."
  
  # Check if staging database exists
  if ! mysql -e "USE paranoid_staging_DB;" 2>/dev/null; then
    log "Creating staging database..."
    mysql -e "CREATE DATABASE IF NOT EXISTS paranoid_staging_DB;"
    mysql -e "GRANT ALL PRIVILEGES ON paranoid_staging_DB.* TO 'paranoid_admin'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"
  else
    log "Staging database already exists"
  fi
  
  # Set up nginx configuration
  if [[ ! -f /etc/nginx/sites-available/paranoid-comic-staging ]]; then
    log "Installing nginx staging configuration..."
    sudo cp nginx-staging.conf /etc/nginx/sites-available/paranoid-comic-staging
    sudo ln -sf /etc/nginx/sites-available/paranoid-comic-staging /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
  else
    log "Nginx staging configuration already exists"
  fi
  
  # Get SSL certificate
  if [[ ! -f /etc/letsencrypt/live/dev.23-187-248-222.sslip.io/fullchain.pem ]]; then
    log "Obtaining SSL certificate for staging..."
    sudo certbot --nginx -d dev.23-187-248-222.sslip.io
  else
    log "SSL certificate for staging already exists"
  fi
  
  log "Staging setup complete!"
}

cmd_nginx_test() {
  log "Testing nginx configuration:"
  sudo nginx -t
}

cmd_nginx_reload() {
  log "Reloading nginx configuration:"
  sudo nginx -t && sudo systemctl reload nginx
}

cmd_ssl_renew() {
  log "Renewing SSL certificates:"
  sudo certbot renew --quiet
  sudo systemctl reload nginx
}

# Main command processing
if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

command="$1"
shift

case "$command" in
  status) cmd_status "$@" ;;
  logs) cmd_logs "$@" ;;
  restart) cmd_restart "$@" ;;
  stop) cmd_stop "$@" ;;
  deploy) cmd_deploy "$@" ;;
  setup-staging) cmd_setup_staging ;;
  nginx-test) cmd_nginx_test ;;
  nginx-reload) cmd_nginx_reload ;;
  ssl-renew) cmd_ssl_renew ;;
  -h|--help) usage ;;
  *) echo "Unknown command: $command"; usage; exit 1 ;;
esac