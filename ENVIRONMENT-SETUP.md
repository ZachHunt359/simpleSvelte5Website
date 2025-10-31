# Multi-Environment Setup Guide

This guide explains how to set up and use the environment-aware development and deployment system for the Paranoid Comic website.

## Overview

The system supports three environments:
- **Development**: Local development on your workstation
- **Staging**: Server-based testing environment (dev.23-187-248-222.sslip.io)
- **Production**: Live site (23-187-248-222.sslip.io)

## Environment Files

### `.env` (Common Settings)
Shared settings loaded in all environments. Contains SMTP credentials, auth secrets, and other common configuration.

### `.env.development` (Local Development)
- Uses `http://localhost:5173`
- Local development database (safer for testing)
- Can use SQLite or local MySQL/MariaDB instance

### `.env.production` (Production)
- Uses `https://23-187-248-222.sslip.io`
- Production MariaDB database
- Production-grade settings

### `.env.staging` (Staging)
- Uses `https://dev.23-187-248-222.sslip.io`
- Separate staging database (`paranoid_staging_DB`)
- Production-like environment for testing

## Local Development Setup

### 1. Clear Production Environment Variables

If you previously had production `DATABASE_URL` set globally, clear it:

```powershell
# Remove global DATABASE_URL so dev environment is used
Remove-Item Env:DATABASE_URL

# Or set it to your local dev database for this session
$env:DATABASE_URL = "mysql://dev_user:dev_pass@127.0.0.1:3306/paranoid_dev_DB"
```

### 2. Set Up Local Database (Optional but Recommended)

Either install MariaDB/MySQL locally or use SQLite for simple development:

```powershell
# Option A: Use local MariaDB/MySQL
# Create database: paranoid_dev_DB
# Update .env.development with your local credentials

# Option B: Use SQLite (simpler)
# Edit .env.development and uncomment the SQLite line:
# DATABASE_URL=sqlite:./dev-database.sqlite
```

### 3. Seed Admin User for Development

```powershell
# Seed admin in development environment
npm run seed:admin:dev

# Or manually with custom credentials
node scripts/seed-admin-mysql.js --env development your@email.com YourDevPassword123!
```

### 4. Run Development Server

```powershell
npm run dev
```

This will:
- Load `.env` and `.env.development` automatically (Vite handles this)
- Use your development database
- Run on `http://localhost:5173`

## Server Setup (Production & Staging)

### 1. Database Setup

Create staging database on the server:

```bash
# Connect to MariaDB
sudo mysql -u root -p

# Create staging database
CREATE DATABASE paranoid_staging_DB;
GRANT ALL PRIVILEGES ON paranoid_staging_DB.* TO 'paranoid_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Nginx Configuration

Copy the staging configuration to the server:

```bash
# On the server
sudo cp nginx-staging.conf /etc/nginx/sites-available/paranoid-comic-staging
sudo ln -s /etc/nginx/sites-available/paranoid-comic-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL Certificate for Staging

```bash
# Get SSL certificate for staging subdomain
sudo certbot --nginx -d dev.23-187-248-222.sslip.io
```

### 4. Deploy to Staging

```bash
# Deploy to staging environment
./deploy.sh --env staging

# Deploy to production (default)
./deploy.sh --env production
```

## Daily Workflows

### Local Development

```powershell
# Start development
npm run dev

# Seed test admin (if needed)
npm run seed:admin:dev

# Test login locally
npm run test:login:dev
```

### Server Deployment

```bash
# Deploy to staging for testing
./deploy.sh --env staging

# Test staging deployment
curl -fsS https://dev.23-187-248-222.sslip.io/api/whoami

# Deploy to production after staging verification
./deploy.sh --env production
```

### Environment-Specific Commands

```bash
# Seed admin in specific environment
node scripts/seed-admin-mysql.js --env development user@example.com DevPass123!
node scripts/seed-admin-mysql.js --env staging user@example.com StagingPass123!
node scripts/seed-admin-mysql.js --env production user@example.com ProdPass123!

# Override database URL
node scripts/seed-admin-mysql.js --url mysql://user:pass@host:3306/db user@example.com Pass123!
```

## PM2 Management

### Check Status

```bash
# Check all apps
pm2 status

# Check specific environment
pm2 status paranoid-comic-prod
pm2 status paranoid-comic-staging
```

### View Logs

```bash
# Production logs
pm2 logs paranoid-comic-prod

# Staging logs
pm2 logs paranoid-comic-staging
```

### Restart Specific Environment

```bash
# Restart production only
pm2 restart paranoid-comic-prod

# Restart staging only
pm2 restart paranoid-comic-staging
```

## Troubleshooting

### Local Development Issues

1. **"Invalid credentials" on login**: Ensure you're using the development database and have seeded an admin user with `npm run seed:admin:dev`

2. **Global DATABASE_URL interference**: Clear the global environment variable with `Remove-Item Env:DATABASE_URL`

3. **SQLite issues**: Make sure the `sqlite3` dependency is installed if using SQLite

### Server Issues

1. **Wrong database**: Check that the environment file has the correct `DATABASE_URL` for that environment

2. **Port conflicts**: Production uses port 3000, staging uses port 3001

3. **SSL certificate issues**: Ensure certificates exist for both domains

4. **PM2 not loading environment**: Check that `DOTENV_CONFIG_PATH` is set correctly in ecosystem.config.js

## Security Notes

1. **Staging Access**: Consider adding Basic Auth to staging (see nginx-staging.conf comments)

2. **Environment Files**: Never commit `.env.local`, `.env.*.local`, or files with real credentials

3. **Database Isolation**: Staging and production use separate databases to prevent accidents

4. **Firewall**: Consider restricting staging access to specific IP ranges

## File Structure

```
.env                    # Common settings
.env.development        # Local dev overrides  
.env.production         # Production overrides
.env.staging           # Staging overrides
ecosystem.config.js    # PM2 configuration for both environments
nginx-staging.conf     # Nginx config template for staging
deploy.sh             # Enhanced deployment script
```

## Next Steps

1. Set up your local development database
2. Test local development with `npm run dev`
3. Deploy staging environment on the server
4. Verify staging works before deploying to production
5. Set up monitoring and alerting for both environments