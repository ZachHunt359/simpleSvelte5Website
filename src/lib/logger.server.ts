import fs from 'fs';
import path from 'path';

const logDir = path.resolve(process.cwd(), 'build', 'logs');
const logFile = path.join(logDir, 'server.log');

function ensureDir() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    // ensure the log file exists (touch)
    try {
      fs.writeFileSync(logFile, '', { flag: 'a' });
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // best-effort only
    // eslint-disable-next-line no-console
    console.error('logger: failed to ensure log dir', e && e.message ? e.message : e);
  }
}

// Ensure the directory and file exist eagerly when the module is loaded.
// This makes it easier to find the log file during development.
try {
  ensureDir();
} catch (e) {
  // swallow - ensureDir already logs errors
}

export function writeLog(entry: { level?: string; msg: string; meta?: any }) {
  try {
    ensureDir();
    const out = {
      ts: new Date().toISOString(),
      level: entry.level || 'error',
      msg: entry.msg,
      meta: entry.meta ?? null
    };
    fs.appendFileSync(logFile, JSON.stringify(out) + '\n', 'utf8');
  } catch (e) {
    // fallback to console
    // eslint-disable-next-line no-console
    console.error('logger: write failed', e && e.message ? e.message : e, entry);
  }
}

export function logError(msg: string, meta?: any) {
  writeLog({ level: 'error', msg, meta });
}

export function logInfo(msg: string, meta?: any) {
  writeLog({ level: 'info', msg, meta });
}

export default { logError, logInfo };
