# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Handoff / Deployment checklist

When handing this site off to ops or deploying to production, follow these steps to ensure a smooth rollout.

1) Prepare environment variables

 - Copy `.env.example` to `.env` and fill in real secrets (SMTP credentials, AUTH_SECRET, SITE_ORIGIN, optional DATABASE_PATH).
 - `.env` is ignored by git; never commit secrets.

2) Database setup & migrations

- Development (SQLite - optional):

	- If you run the app locally with the default SQLite database, backup the DB file before running migrations:

	```powershell
	cd C:\path\to\app
	copy .\data\db.db .\data\db.db.bak
	```

	- Apply the SQLite migrations (the project provides helper scripts that operate on the SQLite file):

	```powershell
	cd C:\path\to\app
	npm run migrate
	```

- Production (MariaDB / MySQL — recommended for shared hosts like cPanel):

	- Create the production database on the host (via phpMyAdmin, cPanel MySQL Databases, or the mysql CLI) and import the canonical schema file in `data/mysql_schema.sql`:

	```sql
	-- example using mysql CLI
	mysql -u youruser -p -h yourhost -P 3306 your_database_name < data/mysql_schema.sql
	```

	- Important: the repo's `scripts/*` migration helpers are SQLite-oriented. For new MySQL deployments import `data/mysql_schema.sql` directly. If you need to migrate existing data from the local SQLite DB to MariaDB, export the data and import it into MySQL (this is a separate migration task; ask me and I can help create migration scripts).

Note: It's recommended to keep the `data/migrate_*.sql` migration files in the repository even after they've been applied. They provide an audit trail of schema changes, are useful for debugging and reproducing historical states, and are used by the repo's migration/status utilities. If you prefer to tidy the repo you can archive them (see `CONTRIBUTING.md` for guidance), but don't delete them without first exporting a verified schema snapshot (e.g. `data/mysql_schema.sql`) and updating any migration-related scripts.

3) Ensure runtime file permissions

 - The Node process must be able to write to:
	 - `static/panels` (for uploads, thumbnails, panels.json)
	 - `build/logs` (for server logs)

 - Example PowerShell to create directories and grant modify to the current user (adjust for your service account):

```powershell
New-Item -ItemType Directory -Force -Path .\static\panels, .\build\logs
icacls .\static\panels /grant 'Users:(OI)(CI)M' /T
icacls .\build\logs /grant 'Users:(OI)(CI)M' /T
```

4) Panels.json generation and runtime

 - The site reads `/panels.json` from disk via `src/routes/panels.json/+server.ts` so changes are visible without restarting.
 - `scripts/generate-panels-json.js` writes `static/panels.json` atomically. Call it after uploads:

```powershell
cd C:\path\to\app
node scripts/generate-panels-json.js
# or
npm run generate:panels
```

 - At startup the app will check whether `static/panels.json` is missing or stale and spawn the generator to rebuild it automatically.

5) Startup checks

 - The server performs a startup writable-path check for `build/logs` and `static/panels`. If those directories are not writable the process will exit with code 1 to prevent misconfigured runs.

6) Upload/request body size limits (important)

- SvelteKit adapter-node enforces a default request body limit of 512KB. File uploads larger than this will fail with HTTP 500 before reaching your endpoint (so you won't see your own logs).
- To allow uploads:
	- Set the environment variable `BODY_SIZE_LIMIT` to a larger value (supports K/M/G suffix), e.g. `10M` or `50M`.
	- Ensure your reverse proxy (e.g. Nginx) also allows large bodies: `client_max_body_size 50m;` within the appropriate `server`/`location` block.
	- Restart your app and proxy after changes.

Examples (Linux/PM2):

```bash
# in your PM2 ecosystem file for the app process
env: {
	NODE_ENV: 'production',
	BODY_SIZE_LIMIT: '50M',
	// ...other envs like DATABASE_URL, SITE_ORIGIN, SMTP_*
}

# or export before starting (not persistent)
export BODY_SIZE_LIMIT=50M; pm2 restart your-app-name --update-env

# Nginx (inside the server/location for your site)
client_max_body_size 50m;
```

6) Useful admin utilities

 - Show migrations status (reads migration files + Migrations table):

```powershell
node scripts/show-migrations-status.cjs
```

 - Admin UI: sign in as an admin and visit `/(authenticated)/admin/migrations` to view migration status in the admin UI.

7) Security checklist

 - Rotate SMTP and AUTH secrets if they were ever committed.
 - Use a dedicated SMTP account for sending. Avoid using personal accounts.

If you'd like, I can also add a short `deploy.sh`/PowerShell script that runs the common steps (backup DB, run migrations, set permissions, regenerate panels). Tell me which platform your production host uses and I'll draft it.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
