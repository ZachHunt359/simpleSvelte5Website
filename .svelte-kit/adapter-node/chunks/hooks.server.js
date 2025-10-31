import { g as getUserFromCookies } from "./helpers.js";
import { l as logInfo, a as logError } from "./logger.js";
import fs from "fs";
import path from "path";
import { i as initPoolFromUrl, v as validateConnection } from "./db.js";
import { spawn } from "child_process";
function checkWritePaths() {
  try {
    const logsDir = path.resolve(process.cwd(), "build", "logs");
    const panelsDir = path.resolve(process.cwd(), "static", "panels");
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (e) {
    }
    try {
      fs.mkdirSync(panelsDir, { recursive: true });
    } catch (e) {
    }
    const testLog = path.join(logsDir, "startup-write-test.tmp");
    const testPanel = path.join(panelsDir, "startup-write-test.tmp");
    fs.writeFileSync(testLog, "ok", { flag: "w" });
    fs.unlinkSync(testLog);
    fs.writeFileSync(testPanel, "ok", { flag: "w" });
    fs.unlinkSync(testPanel);
    logInfo("startup: writeable paths OK", { logsDir, panelsDir });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    try {
      logError("startup: write path check failed", { error: msg });
    } catch (_) {
      console.error("startup: write path check failed", msg);
    }
  }
}
function needPanelsRegen() {
  try {
    const panelsJson = path.resolve(process.cwd(), "static", "panels.json");
    const panelsDir = path.resolve(process.cwd(), "static", "panels");
    if (!fs.existsSync(panelsDir)) return true;
    if (!fs.existsSync(panelsJson)) return true;
    const jsonMtime = fs.statSync(panelsJson).mtimeMs;
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
    return true;
  }
}
function spawnPanelsGenerator() {
  try {
    const node = process.execPath;
    const script = path.resolve(process.cwd(), "scripts", "generate-panels-json.js");
    const child = spawn(node, [script], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    logInfo("spawned generate-panels-json at startup", { script });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    try {
      logError("failed to spawn generate-panels-json", { error: msg });
    } catch (_) {
      console.error("failed to spawn generate-panels-json", msg);
    }
  }
}
try {
  checkWritePaths();
} catch (e) {
  const msg = e && e.message ? e.message : String(e);
  try {
    console.error("startup: fatal write path check failed", msg);
  } catch (_) {
  }
  process.exit(1);
}
try {
  if (needPanelsRegen()) {
    logInfo("panels.json is missing or stale; regenerating at startup");
    spawnPanelsGenerator();
  }
} catch (e) {
  try {
    logError("startup: panels regen check failed", { error: e && e.message ? e.message : String(e) });
  } catch (_) {
    console.error("startup: panels regen check failed", e);
  }
}
try {
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      const dbName = u.pathname ? u.pathname.replace(/^\//, "") : "";
      if (!dbName) {
        try {
          logError("startup: DATABASE_URL invalid - missing database name", { source: process.env.DATABASE_URL });
        } catch (_) {
          console.error("startup: DATABASE_URL invalid - missing database name");
        }
        console.error("FATAL: DATABASE_URL must include a database name (e.g. mysql://user:pass@host:port/dbname)");
        process.exit(1);
      }
      initPoolFromUrl(process.env.DATABASE_URL);
      const retries = Number(process.env.DB_STARTUP_RETRIES ?? 5);
      const delayMs = Number(process.env.DB_STARTUP_DELAY_MS ?? 2e3);
      async function sleep(ms) {
        return new Promise((res) => setTimeout(res, ms));
      }
      async function validateWithRetries() {
        let lastErr = null;
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            await validateConnection();
            logInfo("startup: validated MySQL connection", { database: dbName, attempt });
            return;
          } catch (e) {
            lastErr = e;
            const msg = e && e.message ? e.message : String(e);
            try {
              logError("startup: MySQL validation attempt failed", { attempt, error: msg });
            } catch (_) {
              console.error("startup: MySQL validation attempt failed", attempt, msg);
            }
            if (attempt < retries) {
              await sleep(delayMs);
            }
          }
        }
        throw lastErr;
      }
      try {
        await validateWithRetries();
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        try {
          logError("startup: MySQL validation failed after retries", { error: msg, retries, delayMs });
        } catch (_) {
          console.error("startup: MySQL validation failed after retries", msg);
        }
        console.error("FATAL: MySQL validation failed at startup after retries - see logs for details");
        process.exit(1);
      }
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      try {
        logError("startup: DATABASE_URL invalid", { error: msg });
      } catch (_) {
        console.error("startup: DATABASE_URL invalid", msg);
      }
      console.error("FATAL: DATABASE_URL invalid - see logs for details");
      process.exit(1);
    }
  }
} catch (e) {
  const msg = e && e.message ? e.message : String(e);
  try {
    logError("startup: unexpected error during DB validation", { error: msg });
  } catch (_) {
    console.error("startup: unexpected error during DB validation", msg);
  }
  console.error("FATAL: unexpected error during startup validation - see logs for details");
  process.exit(1);
}
const handle = async ({ event, resolve }) => {
  try {
    const user = await getUserFromCookies(event.cookies);
    event.locals.user = user ?? null;
  } catch (err) {
    console.error("[hooks] getUserFromCookies error", err);
    event.locals.user = null;
  }
  return await resolve(event);
};
export {
  handle
};
