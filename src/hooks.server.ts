import type { Handle } from "@sveltejs/kit";
import { getUserFromCookies } from "$lib/auth/helpers";
import { logError, logInfo } from "$lib/logger";
import fs from 'fs';
import path from 'path';
import { getDb } from '$lib/db';
import * as dbMysql from '$lib/db-mysql';
import { spawn } from 'child_process';
import { activeAdminsCount } from '$lib/panelsHeartbeat';

// Run a quick filesystem sanity check at startup. This runs when the module is evaluated
// during server start and logs a friendly error if critical directories are not writable.
function checkWritePaths() {
	try {
		const logsDir = path.resolve(process.cwd(), 'build', 'logs');
		const panelsDir = path.resolve(process.cwd(), 'static', 'panels');

		// ensure directories exist
		try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) {}
		try { fs.mkdirSync(panelsDir, { recursive: true }); } catch (e) {}

		const testLog = path.join(logsDir, 'startup-write-test.tmp');
		const testPanel = path.join(panelsDir, 'startup-write-test.tmp');

		fs.writeFileSync(testLog, 'ok', { flag: 'w' });
		fs.unlinkSync(testLog);

		fs.writeFileSync(testPanel, 'ok', { flag: 'w' });
		fs.unlinkSync(testPanel);

		logInfo('startup: writeable paths OK', { logsDir, panelsDir });
	} catch (e) {
		// Use the server logger if available; fall back to console
		const msg = (e && e.message) ? e.message : String(e);
		try { logError('startup: write path check failed', { error: msg }); } catch (_) { console.error('startup: write path check failed', msg); }
	}
}

function needPanelsRegen() {
	try {
		const panelsJson = path.resolve(process.cwd(), 'static', 'panels.json');
		const panelsDir = path.resolve(process.cwd(), 'static', 'panels');
		if (!fs.existsSync(panelsDir)) return true;
		if (!fs.existsSync(panelsJson)) return true;

		const jsonMtime = fs.statSync(panelsJson).mtimeMs;

		// Walk panels directory and ensure no file modified after panels.json
		const stack = [panelsDir];
		while (stack.length) {
			const dir = stack.pop();
			for (const name of fs.readdirSync(dir)) {
				const p = path.join(dir, name);
				const st = fs.statSync(p);
				if (st.isDirectory()) stack.push(p);
				else {
					if (st.mtimeMs > jsonMtime) return true;
				}
			}
		}
		return false;
	} catch (e) {
		return true; // be conservative: regen if anything goes wrong
	}
}

function spawnPanelsGenerator() {
	try {
		const node = process.execPath;
		const script = path.resolve(process.cwd(), 'scripts', 'generate-panels-json.js');
		// Spawn detached so it can run independently; keep stdout/stderr inherited for logs
		const child = spawn(node, [script], { detached: true, stdio: 'ignore', windowsHide: true });
		child.unref();
		logInfo('spawned generate-panels-json at startup', { script });
	} catch (e) {
		const msg = e && e.message ? e.message : String(e);
		try { logError('failed to spawn generate-panels-json', { error: msg }); } catch (_) { console.error('failed to spawn generate-panels-json', msg); }
	}
}

// Attempt the startup check now
	try {
		checkWritePaths();
	} catch (e) {
		// If checkWritePaths throws, it's already logged. Exit to avoid running in a bad state.
		const msg = (e && e.message) ? e.message : String(e);
		try { console.error('startup: fatal write path check failed', msg); } catch (_) {}
		// Ensure we exit with non-zero so process manager restarts or reports failure.
		process.exit(1);
	}

	// DISABLED: Auto-regeneration now handled manually via build-panels.cjs
	// We use a manually curated panels.json with natural sorting and proper subdirectory paths
	// If panels.json is missing or stale, regenerate it asynchronously
	// try {
	// 	if (needPanelsRegen()) {
	// 		logInfo('panels.json is missing or stale; regenerating at startup');
	// 		spawnPanelsGenerator();
	// 	}
	// } catch (e) {
	// 	// non-fatal; generation will be attempted later on upload or manual run
	// 	try { logError('startup: panels regen check failed', { error: e && e.message ? e.message : String(e) }); } catch (_) { console.error('startup: panels regen check failed', e); }
	// }

// If DATABASE_URL is set, perform quick sanity checks: ensure a database name is present and test connectivity.
try {
	if (process.env.DATABASE_URL) {
		try {
			const u = new URL(process.env.DATABASE_URL);
			const dbName = u.pathname ? u.pathname.replace(/^\//, '') : '';
			if (!dbName) {
				try { logError('startup: DATABASE_URL invalid - missing database name', { source: process.env.DATABASE_URL }); } catch (_) { console.error('startup: DATABASE_URL invalid - missing database name'); }
				console.error('FATAL: DATABASE_URL must include a database name (e.g. mysql://user:pass@host:port/dbname)');
				process.exit(1);
			}

			// initialize pool and validate with retries at startup
			dbMysql.initPoolFromUrl(process.env.DATABASE_URL);

			const retries = Number(process.env.DB_STARTUP_RETRIES ?? 5);
			const delayMs = Number(process.env.DB_STARTUP_DELAY_MS ?? 2000);

			async function sleep(ms: number) {
				return new Promise((res) => setTimeout(res, ms));
			}

			async function validateWithRetries() {
				let lastErr: any = null;
				for (let attempt = 1; attempt <= retries; attempt++) {
					try {
						await dbMysql.validateConnection();
						logInfo('startup: validated MySQL connection', { database: dbName, attempt });
						return;
					} catch (e) {
						lastErr = e;
						const msg = e && e.message ? e.message : String(e);
						try { logError('startup: MySQL validation attempt failed', { attempt, error: msg }); } catch (_) { console.error('startup: MySQL validation attempt failed', attempt, msg); }
						if (attempt < retries) {
							// wait before next attempt
							await sleep(delayMs);
						}
					}
				}
				// All attempts failed
				throw lastErr;
			}

			try {
				await validateWithRetries();
			} catch (e) {
				const msg = e && e.message ? e.message : String(e);
				try { logError('startup: MySQL validation failed after retries', { error: msg, retries, delayMs }); } catch (_) { console.error('startup: MySQL validation failed after retries', msg); }
				console.error('FATAL: MySQL validation failed at startup after retries - see logs for details');
				process.exit(1);
			}
		} catch (e) {
			const msg = e && e.message ? e.message : String(e);
			try { logError('startup: DATABASE_URL invalid', { error: msg }); } catch (_) { console.error('startup: DATABASE_URL invalid', msg); }
			console.error('FATAL: DATABASE_URL invalid - see logs for details');
			process.exit(1);
		}
	}
} catch (e) {
	// If anything unexpected happens during startup checks, treat as fatal.
	const msg = e && e.message ? e.message : String(e);
	try { logError('startup: unexpected error during DB validation', { error: msg }); } catch (_) { console.error('startup: unexpected error during DB validation', msg); }
	console.error('FATAL: unexpected error during startup validation - see logs for details');
	process.exit(1);
}

// Scheduled regeneration: DISABLED - manual panels.json management only
// The automatic regeneration was overwriting the manually curated panels.json
/*
try {
	const intervalMs = Number(process.env.PANELS_REGEN_INTERVAL_MS ?? 300_000); // default 300s (5 minutes)

	// Log scheduled regeneration cadence once at startup so logs show configured interval
	try { logInfo(`Generating Panels every ${Math.round(intervalMs/60000)} minute(s)`, { intervalMs }); } catch (_) {}
	setInterval(() => {
		try {
			// Skip if any admin heartbeats active in the last 30s
			const active = activeAdminsCount(30_000);
			if (active > 0) {
				logInfo('panels regen skipped due to active admin(s)', { active });
				return;
			}
			if (needPanelsRegen()) {
				logInfo('scheduled panels.json regeneration triggered');
				spawnPanelsGenerator();
			}
		} catch (err) {
			try { logError('scheduled panels regen error', { error: err && err.message ? err.message : String(err) }); } catch (_) { console.error('scheduled panels regen error', err); }
		}
	}, intervalMs);
} catch (e) {
	try { logError('failed to initialize scheduled panels regen', { error: e && e.message ? e.message : String(e) }); } catch (_) { console.error('failed to initialize scheduled panels regen', e); }
}
*/

export const handle: Handle = async ({ event, resolve }) => {
	try {
		console.log('[hooks] handle called for:', event.url.pathname);
		const user = await getUserFromCookies(event.cookies);
		console.log('[hooks] user from cookies:', user ? `${user.id}:${user.email}` : 'NULL');
		event.locals.user = user ?? null;
	} catch (err) {
		console.error('[hooks] getUserFromCookies error', err);
		event.locals.user = null;
	}

	return await resolve(event);
};
