# Project Handover Documentation

**Project:** PARANOiD Comic Website  
**Date:** July 16, 2026  
**Repository:** https://github.com/ZachHunt359/simpleSvelte5Website

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Infrastructure](#infrastructure)
3. [Access & Credentials](#access--credentials)
4. [Architecture](#architecture)
5. [Local Development Setup](#local-development-setup)
6. [Deployment](#deployment)
7. [Database](#database)
8. [Environment Configuration](#environment-configuration)
9. [Third-Party Services](#third-party-services)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)
12. [Known Issues & Technical Debt](#known-issues--technical-debt)
13. [Feature Roadmap & Pending Work](#feature-roadmap--pending-work)
14. [Important Implementation Notes](#important-implementation-notes)
15. [Handover Checklist](#handover-checklist)

---

## Project Overview

A SvelteKit-based webcomic reader with admin panel for managing content, user inquiries, and site settings.

**Tech Stack:**
- **Frontend:** SvelteKit 5, TypeScript, Vite
- **Backend:** Node.js (adapter-node), Express
- **Database:** MariaDB (everywhere)
- **Process Manager:** PM2
- **Web Server:** Nginx (reverse proxy)
- **Authentication:** Custom JWT-based auth with cookies

**Key Features:**
- Comic reader with desktop/mobile optimized panels
- Admin panel for content management
- User inquiry system with email notifications
- Image serving mode controls (desktop-only, mobile-only, auto)
- YouTube video embedding in comic flow

---

## Infrastructure

### Server Details
- **Provider:** VPS (Ubuntu)
- **IP Address:** `23.187.248.222`
- **Domains:**
  - Production: `https://paranoidcomic.com`
  - Staging: `https://dev.23-187-248-222.sslip.io`
- **OS:** Ubuntu Linux
- **SSH User:** `deploy`

### Running Services
```bash
# PM2 processes
pm2 list
# - paranoid-comic-prod (port 3000) - Production
# - paranoid-comic-staging (port 3001) - Staging

# Nginx (reverse proxy on ports 80/443)
sudo systemctl status nginx

# MariaDB
sudo systemctl status mariadb
```

---

## Access & Credentials

**⚠️ IMPORTANT:** All passwords, API keys, and sensitive credentials are in `CREDENTIALS.md` (gitignored).  
**Share `CREDENTIALS.md` separately via secure channel** (encrypted email, password manager, Signal, etc.).  
**NEVER commit CREDENTIALS.md to GitHub.**

### SSH Access
**Current Setup:**
- Server: `23.187.248.222`
- Username: `deploy`
- Password: See `CREDENTIALS.md`
- Authentication: Password-based (recommend upgrading to SSH keys)

**Setting up SSH key access:**
1. Generate key pair: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Share public key (`~/.ssh/id_ed25519.pub`) with previous dev
3. Previous dev adds to server: `~/.ssh/authorized_keys`
4. Test: `ssh deploy@23.187.248.222`

**Security recommendations:**
- Disable password auth after SSH keys work
- Change `deploy` password after handover
- Consider fail2ban for brute force protection

### GitHub Access
- **Repository:** https://github.com/ZachHunt359/simpleSvelte5Website
- New dev should fork or be added as collaborator
- All development so far happens on `main` branch

### Database Access
- **Host:** `localhost` (on server) or `23.187.248.222` (remote)
- **Port:** `3306`
- **Credentials:** See `CREDENTIALS.md`
- **Databases:** 
  - Production: `paranoid_DB`
  - Staging: `paranoid_staging_DB`

### Admin Panel Access
- **Production URL:** `https://paranoidcomic.com/login`
- **Staging URL:** `https://dev.23-187-248-222.sslip.io/login`
- **Credentials:** See `CREDENTIALS.md`

### SMTP Email Service
Used for sending inquiry notifications and admin invite emails.
- **Service:** Gmail SMTP
- **Credentials:** See `CREDENTIALS.md`
- **Note:** Uses App Password, not regular Gmail password

---

## Architecture

### Directory Structure
```
simpleSvelte5Website/
├── src/
│   ├── routes/              # SvelteKit routes
│   │   ├── [chapter]/[panel]/  # Comic reader
│   │   ├── (authenticated)/     # Protected routes
│   │   │   ├── admin/           # Admin panel
│   │   │   ├── dashboard/       # Inquiries management
│   │   │   └── upload/          # File upload interface
│   │   └── api/                 # API endpoints
│   ├── lib/                 # Shared components & utilities
│   │   ├── auth/            # Authentication helpers
│   │   ├── db.ts            # Database wrapper (SQLite fallback, MySQL primary)
│   │   └── db-mysql.ts      # MySQL-specific implementation
│   └── styles/              # Global CSS
├── static/
│   ├── panels/              # Production comic images
│   ├── panels-staging/      # Staging comic images
│   └── panels.json          # Generated panel metadata
├── data/
│   ├── mysql_schema.sql     # Complete database schema
│   ├── migrate_*.sql        # Database migrations
│   └── db.db                # SQLite fallback (not used in production)
├── scripts/
│   ├── generate-panels-json.js     # Scans filesystem, generates panels.json
│   ├── ensure-youtube-entries.js   # Inserts YouTube videos in order
│   ├── apply-sitesettings-migration.js  # Apply new migrations
│   └── seed-admin-mysql.js         # Create admin users
├── .env                     # Local development (gitignored)
├── .env.staging             # Staging config (on server)
├── .env.production          # Production config (on server)
└── deploy.sh                # Deployment script

```

### Data Flow

**Comic Reader:**
1. User visits `/chapter-1/Spread01.2`
2. SvelteKit loads `panels.json` (generated from filesystem)
3. Fetches image serving mode from `/api/settings`
4. Renders appropriate image (desktop/mobile/auto)
5. Preloads next 3 panels + 1 previous

**File Upload:**
1. Admin uploads via `/upload`
2. Files saved to `static/panels-staging/` or `static/panels/`
3. `generate-panels-json.js` runs automatically
4. Natural sort ensures correct order (Spread2.3 < Spread2.4 < Spread30)
5. YouTube entries preserved during sort

**Inquiries:**
1. User submits via `/api/inquiry`
2. Stored in `Inquiries` table
3. Admin replies via `/dashboard`
4. Email sent via nodemailer + SMTP
5. Tracks send attempts in `SendAttempts` table

---

## Deployment

### Initial Setup (Already Done)
The server is already configured. Skip this unless rebuilding from scratch.

### Deploying Updates

**From your local machine:**
```bash
# 1. Commit and push changes
git add .
git commit -m "Your changes"
git push origin main

# 2. SSH to server
ssh deploy@23.187.248.222

# 3. Deploy staging
cd ~/simpleSvelte5Website
./deploy.sh --env staging

# 4. Test staging site
# Visit https://dev.23-187-248-222.sslip.io

# 5. Deploy production (when ready)
# Visit https://paranoidcomic.com to verify
./deploy.sh --env production
```

**What `deploy.sh` does:**
1. Pulls latest from git
2. Runs `npm ci` (clean install)
3. Generates `panels.json`
4. Builds with Vite
5. Restarts PM2 process
6. Optional smoke test

**Deployment flags:**
```bash
./deploy.sh --env staging        # Deploy to staging
./deploy.sh --env production     # Deploy to production
./deploy.sh --no-pull            # Skip git pull
./deploy.sh --no-smoke           # Skip smoke test
```

### Manual PM2 Management
```bash
# View logs
pm2 logs paranoid-comic-staging
pm2 logs paranoid-comic-prod

# Restart
pm2 restart paranoid-comic-staging
pm2 restart paranoid-comic-prod

# View status
pm2 status

# View detailed info
pm2 show paranoid-comic-staging
```

---

## Database

### Schema Overview

**Tables:**
- `AdminUsers` - Admin login credentials
- `Inquiries` - User messages to admin
- `InviteCodes` - Admin invite system
- `Sessions` - User sessions
- `SendAttempts` - Email delivery tracking
- `SiteSettings` - Global configuration
- `Migrations` - Migration tracking (if used)

### Running Migrations

**New migrations go in `data/` as `migrate_*.sql`**

**For MariaDB (staging/production):**
```bash
# On the server
cd ~/simpleSvelte5Website
mysql -u paranoid_admin -p paranoid_staging_DB < data/migrate_FILENAME.sql
mysql -u paranoid_admin -p paranoid_DB < data/migrate_FILENAME.sql
```

**Example - SiteSettings migration:**
```bash
mysql -u paranoid_admin -p paranoid_staging_DB < data/migrate_add_site_settings_mariadb.sql
```

### Database Backups

**Manual backup:**
```bash
# On server
mysqldump -u paranoid_admin -p paranoid_DB > backup_$(date +%Y%m%d).sql
mysqldump -u paranoid_admin -p paranoid_staging_DB > backup_staging_$(date +%Y%m%d).sql
```

**Restore:**
```bash
mysql -u paranoid_admin -p paranoid_DB < backup_20260716.sql
```

**Recommended:** Set up automated daily backups with cron.

### Viewing Data
```bash
# Connect to database
mysql -u paranoid_admin -p paranoid_DB

# Common queries
SELECT * FROM AdminUsers;
SELECT * FROM Inquiries ORDER BY MessTimestamp DESC LIMIT 10;
SELECT * FROM SiteSettings;
SELECT COUNT(*) FROM Sessions;
```

---

## Environment Configuration

### Environment Variables

**Required in all `.env` files:**
```bash
# Site URLs
SITE_ORIGIN=https://example.com
AUTH_URL=https://example.com/api/auth

# Database
DATABASE_URL=mariadb://user:pass@localhost:3306/dbname

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Panel Storage
PANELS_DIR=static/panels
STATIC_ASSET_BASE=/panels
PUBLIC_STATIC_ASSET_BASE=/panels

# Admin seed credentials (for initial setup)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!
```

**Optional:**
```bash
# YouTube Data API (for fetching video titles)
# Get a free API key from https://console.cloud.google.com/apis/credentials
# Without this, titles are fetched via oEmbed (less reliable but no API key needed)
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### Environment Files

**Local (`.env`):**
- Your own local development config
- Use localhost URLs
- Can use local MariaDB or point to staging

**Staging (`.env.staging` on server):**
- `SITE_ORIGIN=https://dev.23-187-248-222.sslip.io`
- `DATABASE_URL=mariadb://paranoid_admin:...@localhost:3306/paranoid_staging_DB`
- `PANELS_DIR=static/panels-staging`
- `PUBLIC_STATIC_ASSET_BASE=/panels-staging`

**Production (`.env.production` on server):**
- `SITE_ORIGIN=https://paranoidcomic.com`
- `DATABASE_URL=mariadb://paranoid_admin:...@localhost:3306/paranoid_DB`
- `PANELS_DIR=static/panels`
- `PUBLIC_STATIC_ASSET_BASE=/panels`

**Security Note:** Never commit `.env` files to git. They're in `.gitignore`.

---

## Third-Party Services

### Email (SMTP)
- **Provider:** Gmail SMTP
- **Purpose:** Send inquiry replies, admin invites
- **Configuration:** Requires App Password (not regular Gmail password)
- **Location:** `.env` files (`SMTP_*` variables)

**To generate new App Password:**
1. Go to Google Account settings
2. Security → 2-Step Verification → App passwords
3. Generate new password
4. Update `.env` files

### Domain/DNS
- **Production Domain:** `paranoidcomic.com` (custom domain)
- **Staging Domain:** `dev.23-187-248-222.sslip.io` (sslip.io wildcard DNS)
- **Server IP:** `23.187.248.222`
- **How sslip.io works:** `*.23-187-248-222.sslip.io` automatically resolves to `23.187.248.222`

**To add additional custom domains:**
1. Point DNS A record to `23.187.248.222`
2. Update nginx config (`/etc/nginx/sites-available/paranoid-comic`)
3. Update `.env` files with new domain
4. Get SSL cert with certbot: `sudo certbot --nginx -d yourdomain.com`

### SSL Certificates
- **Provider:** Let's Encrypt (free)
- **Tool:** Certbot
- **Auto-renewal:** Should be configured via cron
- **Current Certificates:**
  - `paranoidcomic.com` - Active
  - `dev.23-187-248-222.sslip.io` - Active (if HTTPS is used for staging)

**Manual renewal (if needed):**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## Common Tasks

### Adding a New Admin User
```bash
# On server or locally with database access
cd ~/simpleSvelte5Website

# Option 1: Use seed script (interactive)
npm run seed:admin:prod

# Option 2: Direct SQL
mysql -u paranoid_admin -p paranoid_DB
INSERT INTO AdminUsers (Email, PasswordHash, CreatedAt) 
VALUES ('newadmin@example.com', '$2b$10$HASH_HERE', UNIX_TIMESTAMP());
```

**To generate password hash:**
```bash
node -e "console.log(require('bcrypt').hashSync('yourpassword', 10))"
```

### Uploading New Comic Pages

**Via Admin Panel (Recommended):**
1. Login at `/login`
2. Navigate to `/upload`
3. Use file picker to select images
4. Organize files by dragging them into correct chapters
5. Save order - `panels.json` regenerates automatically

**Via SFTP/SCP:**
1. Upload files to `static/panels/` or `static/panels-staging/`
2. SSH to server
3. Run: `npm run generate:panels`
4. Restart PM2: `pm2 restart paranoid-comic-prod`

### Changing Image Serving Mode
1. Login as admin
2. Navigate to `/admin/settings`
3. Select mode:
   - **Auto** - Desktop images on wide screens, mobile on narrow
   - **Desktop Only** - Force desktop images for all users
   - **Mobile Only** - Force mobile images for all users
4. Click "Save Settings"
5. Users see new mode on page reload

### Inserting YouTube Videos
YouTube videos can be embedded at any point in the comic timeline.

**Via Admin Panel (Recommended):**
1. Login at `/login`
2. Navigate to `/upload`
3. In the Chapter Tree, click "Insert YouTube" button next to the chapter
4. Paste YouTube URL or video ID (e.g., `dQw4w9WgXcQ` or `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
5. Video title is fetched automatically (uses YouTube Data API if `YOUTUBE_API_KEY` is set, otherwise falls back to oEmbed)
6. **Initial state:** Video appears in "Other Files" section in an **Unpublished** state
7. **For Desktop:** Drag the video from "Other Files" into the "Desktop Panels" group at the desired position
8. **Publish Desktop:** Click the video's publish toggle to mark it as published
9. **For Mobile:** Insert the **same video again** (repeat steps 3-4) - it will appear in "Other Files" again
10. **Position Mobile:** Drag the second instance into the "Mobile Panels" group (typically at a different position than desktop)
11. **Publish Mobile:** Click the publish toggle on the mobile instance
12. **Save:** Click "Save Changes" button to persist the order
13. **Regenerate:** Click "Regenerate Panels" to update `panels.json` so readers see the videos

**Important Notes:**
- Each video needs to be inserted **twice** - once for desktop, once for mobile
- Desktop and mobile versions can be positioned independently (they usually appear at different points in the reading order)
- Videos remain **unpublished** until you explicitly toggle them
- Videos are preserved when using "Sort All Files" - they stay at their anchored positions relative to image files
- Videos are preserved when chapter is locked/unlocked

**Getting YouTube Data API Key (Optional but Recommended):**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Add to `.env`: `YOUTUBE_API_KEY=your_api_key_here`
6. Without API key, oEmbed is used (works but less reliable)

**Via Script (Legacy):**
If you need to bulk-insert or reposition existing videos:
1. Edit `scripts/ensure-youtube-entries.js`
2. Update the `youtubeEntries` arrays
3. Run: `npm run ensure-youtube`
4. Regenerate panels: `npm run generate:panels`

### Viewing Logs

**PM2 logs:**
```bash
pm2 logs paranoid-comic-staging --lines 100
pm2 logs paranoid-comic-prod --lines 100
```

**Application logs:**
```bash
# On server
tail -f ~/simpleSvelte5Website/build/logs/pm2-staging-out-*.log
tail -f ~/simpleSvelte5Website/build/logs/pm2-prod-out-*.log
```

**Nginx logs:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### Site is Down
```bash
# 1. Check PM2 status
pm2 status

# 2. Check logs for errors
pm2 logs paranoid-comic-prod --err --lines 50

# 3. Restart if needed
pm2 restart paranoid-comic-prod

# 4. Check nginx
sudo systemctl status nginx

# 5. Check database connection
mysql -u paranoid_admin -p paranoid_DB -e "SELECT 1"
```

### Build Fails
```bash
# Check for dependency issues
npm ci

# Check for TypeScript errors
npm run check

# Check Vite build
npm run build
```

### Database Connection Issues
```bash
# 1. Verify MariaDB is running
sudo systemctl status mariadb

# 2. Test connection
mysql -u paranoid_admin -p -e "SELECT 1"

# 3. Check DATABASE_URL in .env files
cat .env.production | grep DATABASE_URL

# 4. Check user permissions
mysql -u root -p
SHOW GRANTS FOR 'paranoid_admin'@'localhost';
```

### Panels Not Loading (404 errors)
```bash
# 1. Check if panels.json exists
ls -la static/panels.json

# 2. Regenerate panels.json
npm run generate:panels

# 3. Check environment variable
# Make sure STATIC_ASSET_BASE matches actual directory
cat .env.production | grep STATIC_ASSET_BASE

# 4. Check nginx static file serving
# Verify /panels/ location in nginx config
sudo nano /etc/nginx/sites-available/paranoid-comic
```

### Email Not Sending
```bash
# 1. Check SMTP credentials in .env
cat .env.production | grep SMTP

# 2. Test SMTP connection manually
node scripts/send-test-email.js

# 3. Check SendAttempts table for errors
mysql -u paranoid_admin -p paranoid_DB
SELECT * FROM SendAttempts ORDER BY AttemptedAt DESC LIMIT 10;

# 4. Verify Gmail App Password is valid
# May need to regenerate if Google revoked it
```

---

## Known Issues & Technical Debt

### Debug Logging
- **Issue:** Console logs for debugging panel navigation (lines like `[next] Called`, `[isLastPanel]`) are still active in production
- **Impact:** Minor performance impact, clutters console
- **Fix:** Remove or wrap in development-only checks before production deployment
- **Files:** `src/routes/[chapter]/[panel]/+page.svelte`

### Migration System
- **Issue:** Two parallel migration systems exist:
  - SQLite migrations in `data/migrate_*.sql` (not used in production)
  - Manual MariaDB migrations (used everywhere)
- **Impact:** Confusion, inconsistency
- **Recommendation:** Standardize on one migration approach, remove SQLite files or clearly document they're for local dev only

### Environment Variable Complexity
- **Issue:** Three layers of config (`.env`, `.env.staging`, `.env.production`) with some duplication
- **Impact:** Easy to forget to update all three when adding new variables
- **Recommendation:** Document which variables are environment-specific vs shared

### Hard-coded Admin Email
- **Issue:** Admin email `zachdhunt@gmail.com` is seeded in `mysql_schema.sql` and used in various places
- **Action Required:** Update schema file, reseed AdminUsers table with your admin email

### YouTube Entry Management
- **Issue:** YouTube video positions are hard-coded in `ensure-youtube-entries.js`
- **Impact:** Requires code changes and script runs to modify
- **Future Enhancement:** Move to database or admin UI for easier management

### Panel Filename Inconsistencies
- **Issue:** Some files are named `Spread02.3`, others `Spread2.3`, creating URL mismatches
- **Status:** Partially mitigated by fuzzy matching logic (recent addition)
- **Long-term:** Standardize filename format

### Inquiry Modal Auto-open
- **Issue:** Auto-opens after 3 seconds on last panel, might annoy users
- **Recommendation:** Make delay configurable or add user preference

### No Automated Backups
- **Issue:** Database backups are manual
- **Impact:** Risk of data loss
- **Action Required:** Set up automated daily backups with cron + offsite storage

### SSL Certificate Renewal
- **Issue:** Should be automated, but verify it's working
- **Action Required:** Confirm certbot auto-renewal cron job exists
- **Check:** `sudo certbot renew --dry-run`

---

## Local Development Setup

### Docker MariaDB Environment

Local development uses Docker MariaDB with specific naming:

**Container Details:**
```bash
# Container name
paranoid_mariadb

# Database name (note the capital 'i' - legacy naming)
PARANOiD_DB

# Credentials
User: root
Password: rootpass
Port: 3306

# Connection string
mysql://root:rootpass@127.0.0.1:3306/PARANOiD_DB
```

**Starting Development:**
```bash
# 1. Start Docker container
docker start paranoid_mariadb

# 2. Verify connection
docker exec -it paranoid_mariadb mariadb -u root -prootpass -e "USE PARANOiD_DB; SHOW TABLES;"

# 3. Seed admin user (first time only)
npm run seed:admin:dev

# 4. Start dev server
npm run dev
```

**Note**: Keep the dev server running in a dedicated terminal to preserve hot-reload functionality.

**Development Server:**
- Runs on: `http://localhost:5173/`
- Hot reload enabled
- Auto-recompiles on file changes

---

## Important Implementation Notes

### Multi-Select Drag Pattern (Upload Interface)

The upload interface uses `svelte-dnd-action` for drag-and-drop with multi-select support.

**Key behavior**: When dragging one item from a multi-selection, all selected items move together as a block.

**Implementation approach** (Option 5 Pattern):
- During drag: Library handles visual feedback, array remains unchanged
- On drop: Find where dragged item landed, remove all selected items, re-insert at new position
- Use base ID (strip "-1" suffix) for selection matching
- See `.github/instructions/MULTI_SELECT_DRAG_OPTIONS.md` for detailed analysis

### Panel Matching Logic

When switching between desktop/mobile modes, the reader uses intelligent matching:
1. Exact filename match
2. Fuzzy match (normalizes `Spread02` → `Spread2`)
3. Closest Spread number by numeric value
4. Same array index as fallback

Prevents users from being kicked to start of comic when admin changes image serving mode.

---

## Feature Roadmap & Pending Work

### Completed Recent Features ✅
- [x] Image serving mode controls (desktop-only, mobile-only, auto)
- [x] Intelligent panel matching when switching modes
- [x] Inquiry modal auto-open at end of comic
- [x] Admin settings page
- [x] Multi-environment deployment system

### Pending Feature Requests

#### 1. Multi-Select Panel Management ⏳
**Status**: Partially implemented (multi-select exists, but limited functionality)

**Requested Features:**
- Checkboxes for multi-select in Current Comic File Tree ✅ (done)
- "Select All" button for bulk selection
- Two options for moving selected panels:
  - Drag selected panels as a group ✅ (done with Option 5 pattern)
  - Dropdown to choose destination chapter (not implemented)

**Use Case**: Admin needs to move multiple panels from "Uncategorized" back to their correct chapters efficiently.

**Implementation Notes**: The drag-and-drop multi-select is working using the Option 5 pattern. Still needs the dropdown alternative for keyboard-only users.

#### 2. Chapter/Panel Locking System 🔒
**Status**: Not started

**Requested Features:**
- Lock/unlock toggle for individual chapters
- Lock/unlock toggle for individual panels  
- "Are you sure?" confirmation popup when unlocking
- Visual indicator (lock icon) for locked items
- Locked items cannot be:
  - Moved via drag-and-drop
  - Deleted
  - Reordered
  - Modified (metadata changes still allowed)

**Use Case**: Protect published comic content from accidental changes during new uploads.

**Database Changes Needed**:
```sql
ALTER TABLE Panels ADD COLUMN IsLocked BOOLEAN DEFAULT FALSE;
-- Or store in _order.json metadata
```

#### 3. Image Dimension-Based Device Detection 📐
**Status**: Not started

**Requested Features:**
- During upload, analyze image height:width ratio
- Compare ratio-based device guess with folder-based device detection
- If conflict detected:
  - Trust the folder name (user intention)
  - Show confirmation popup flagging the conflict
  - Allow admin to confirm or correct before proceeding
- Suggested ratio thresholds:
  - Mobile: height > width (portrait orientation)
  - Desktop: width > height (landscape orientation)

**Use Case**: Catch mistakes where mobile images are in desktop folder or vice versa.

**Implementation Location**: `src/routes/(authenticated)/upload/+page.svelte` in file upload handler.

### Future Enhancements (Not Requested Yet)

**Panel Publishing/Scheduling**:
- Currently all uploaded panels are immediately visible
- Consider migrating publish/scheduling metadata from `_order.json` to database
- Proposed fields: `is_published` (BOOLEAN), `publish_date` (DATETIME), `scheduled_by`, `updated_by`
- Migration would require: database columns, backfill script from `_order.json`, update generator to read from DB, admin UI for editing

**Automated Backups**:
- Set up cron job for daily database backups
- Offsite storage (S3, Backblaze, etc.)
- Backup retention policy

**Performance Monitoring**:
- Add application performance monitoring (APM)
- Track page load times
- Monitor database query performance

---

## Handover Checklist

### For Previous Developer
- [ ] Add new developer's SSH public key to server
- [ ] Share `CREDENTIALS.md` via secure channel
- [ ] Add new developer as GitHub collaborator
- [ ] Walk through deployment process
- [ ] Transfer domain/DNS access if applicable

### For New Developer  
- [ ] Test SSH access to server
- [ ] Clone repository and set up local environment
- [ ] Build and run locally
- [ ] Deploy to staging and verify
- [ ] Review admin panel features
- [ ] Test inquiry and upload flows
- [ ] Verify database and log access
- [ ] Update passwords (server, database, admin panel)
- [ ] Set up automated backups (if needed)

---

## Contact for Questions

**Previous Developer:** zachhunt359 on Discord, or ZachDHunt(at)gmail(dot)com

**Repository Issues:** https://github.com/ZachHunt359/simpleSvelte5Website/issues

---

**Document Version:** 1.0  
**Last Updated:** July 16, 2026
