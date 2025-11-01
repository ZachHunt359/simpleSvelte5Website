<#
deploy.ps1

Simple deployment helper for Windows PowerShell.

Features:
- Installs dependencies (uses `npm ci` when package-lock.json exists, otherwise `npm install`).
- Ensures writable directories exist (`static/panels`, `build/logs`).
- If `DATABASE_URL` is set, attempts to import `data/mysql_schema.sql` into the target MySQL/MariaDB database using the `mysql` CLI (if available).
- If `DATABASE_URL` is not set, treats the app as using SQLite: backs up `data/db.db` (if present) and runs `npm run migrate`.
- Regenerates `panels.json` and builds the site (`npm run generate:panels` then `npm run build`).
- Optional `-Start` switch attempts to start the app via `pm2` or prints the start command.

Usage:
  .\deploy.ps1            # run deploy steps
  .\deploy.ps1 -Start     # run deploy steps and attempt to start with pm2 (if installed)

Notes:
- The script will not attempt to modify production services beyond optionally starting with pm2.
- For cPanel, import `data/mysql_schema.sql` using the host tools if the `mysql` CLI isn't available on the machine running this script.
#>

param(
    [switch]$Start
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Log($msg) { Write-Host "[deploy] $msg" }

try {
    $root = Split-Path -Parent $MyInvocation.MyCommand.Definition
    Set-Location $root

    Log "Starting deploy in $root"
    # Derive a safe PM2 app name from the repo folder name to avoid hard-coded app names
    try {
        $appName = Split-Path -Leaf $root
        if (-not $appName) { $appName = 'svelte-app' }
    } catch { $appName = 'svelte-app' }

    # Ensure Node.js is available
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js (node) not found in PATH. Install Node.js and retry."
        exit 1
    }

    # Ensure directories
    $dirs = @('static\panels', 'build\logs')
    foreach ($d in $dirs) {
        if (-not (Test-Path $d)) {
            Log "Creating directory $d"
            New-Item -ItemType Directory -Force -Path $d | Out-Null
        }
    }

    # Install dependencies
    if (Test-Path package-lock.json) {
        Log "Installing dependencies with npm ci"
        npm ci
    } else {
        Log "Installing dependencies with npm install"
        npm install
    }

    # Database setup
    if ($env:DATABASE_URL) {
        Log "Detected DATABASE_URL. Attempting to import MySQL schema if available."
        try {
            $u = [System.Uri]$env:DATABASE_URL
            $dbName = $u.AbsolutePath.TrimStart('/')
            if (-not $dbName) {
                Write-Warning "DATABASE_URL does not include a database name. Please set a URL like: mysql://user:pass@host:port/dbname"
            } else {
                $mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
                if ($mysqlCmd) {
                    # extract user and password safely
                    $user = '' ; $pass = ''
                    if ($u.UserInfo) {
                        $parts = $u.UserInfo.Split(':',2)
                        $user = [System.Net.WebUtility]::UrlDecode($parts[0])
                        if ($parts.Length -gt 1) { $pass = [System.Net.WebUtility]::UrlDecode($parts[1]) }
                    }
                    $host = $u.Host
                    $port = if ($u.Port -gt 0) { $u.Port } else { 3306 }

                    if (-not (Test-Path "data\mysql_schema.sql")) {
                        Write-Warning "data\mysql_schema.sql not found; skipping import."
                    } else {
                        Log "Importing data\mysql_schema.sql into $dbName@$host:$port as user '$user'"
                        # Pipe the SQL into the mysql CLI to avoid complex shell escaping
                        $sql = Get-Content -Raw "data\mysql_schema.sql"
                        if ($pass -ne '') {
                            $proc = Start-Process -FilePath mysql -ArgumentList "-h", $host, "-P", $port, "-u", $user, "--password=$pass", $dbName -NoNewWindow -RedirectStandardInput "data\mysql_schema.sql" -PassThru -Wait
                            if ($proc.ExitCode -ne 0) { Write-Warning "mysql returned exit code $($proc.ExitCode). You may need to import the SQL manually." }
                        } else {
                            $proc = Start-Process -FilePath mysql -ArgumentList "-h", $host, "-P", $port, "-u", $user, $dbName -NoNewWindow -RedirectStandardInput "data\mysql_schema.sql" -PassThru -Wait
                            if ($proc.ExitCode -ne 0) { Write-Warning "mysql returned exit code $($proc.ExitCode). You may need to import the SQL manually." }
                        }
                    }
                } else {
                    Write-Warning "mysql CLI not found in PATH. Please import data\mysql_schema.sql into your MySQL/MariaDB instance via phpMyAdmin or the host's tools."
                }
            }
        } catch {
            Write-Warning "Failed to parse or import using DATABASE_URL: $($_.Exception.Message)"
        }
    } else {
        # SQLite path
        if (Test-Path "data\db.db") {
            $bak = "data\db.db.bak.$((Get-Date).ToString('yyyyMMddHHmmss'))"
            Copy-Item "data\db.db" $bak -Force
            Log "Backed up SQLite DB to $bak"
        }
        Log "Running SQLite migrations (npm run migrate)"
        npm run migrate
    }

    # Regenerate panels.json and build
    Log "Regenerating panels.json"
    npm run generate:panels

    Log "Building site"
    npm run build

    if ($Start) {
        Log "Start requested. Attempting to start with pm2 if available."
        if (Get-Command pm2 -ErrorAction SilentlyContinue) {
            Log "Starting app via pm2 (npm run preview) as app name: $appName"
            # Use the derived repo-folder name as the PM2 process name (avoid hard-coded app names)
            pm2 start npm --name $appName -- run preview
        } else {
            Log "pm2 not found. To run the app interactively use: npm run preview -- --port 3000"
            Log "On cPanel, configure the Application Manager to run the built app or use your host's process manager."
        }
    }

    Log "Deploy script completed successfully."
    exit 0
} catch {
    Write-Error "Deploy failed: $($_.Exception.Message)"
    exit 1
}
