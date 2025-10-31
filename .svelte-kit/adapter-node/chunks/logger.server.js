import fs from "fs";
import path from "path";
const logDir = path.resolve(process.cwd(), "build", "logs");
const logFile = path.join(logDir, "server.log");
function ensureDir() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    try {
      fs.writeFileSync(logFile, "", { flag: "a" });
    } catch (e) {
    }
  } catch (e) {
    console.error("logger: failed to ensure log dir", e && e.message ? e.message : e);
  }
}
try {
  ensureDir();
} catch (e) {
}
function writeLog(entry) {
  try {
    ensureDir();
    const out = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      level: entry.level || "error",
      msg: entry.msg,
      meta: entry.meta ?? null
    };
    fs.appendFileSync(logFile, JSON.stringify(out) + "\n", "utf8");
  } catch (e) {
    console.error("logger: write failed", e && e.message ? e.message : e, entry);
  }
}
function logError(msg, meta) {
  writeLog({ level: "error", msg, meta });
}
function logInfo(msg, meta) {
  writeLog({ level: "info", msg, meta });
}
export {
  logError,
  logInfo,
  writeLog
};
