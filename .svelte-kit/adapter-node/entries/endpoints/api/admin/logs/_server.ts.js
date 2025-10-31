import fs from "fs";
import path from "path";
import { i as isAdmin } from "../../../../../chunks/helpers.js";
import { a as logError } from "../../../../../chunks/logger.js";
const logFile = path.resolve(process.cwd(), "build", "logs", "server.log");
const GET = async ({ url, cookies }) => {
  try {
    if (!await isAdmin(cookies)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
    const linesParam = url.searchParams.get("lines") ?? "200";
    let lines = Number(linesParam);
    if (!Number.isFinite(lines) || lines <= 0) lines = 200;
    if (lines > 2e3) lines = 2e3;
    const format = (url.searchParams.get("format") || "text").toLowerCase();
    if (!fs.existsSync(logFile)) {
      return new Response(JSON.stringify({ error: "No log file found" }), { status: 404 });
    }
    const raw = fs.readFileSync(logFile, "utf8");
    const arr = raw.split(/\r?\n/).filter((l) => l && l.trim().length > 0);
    const start = Math.max(0, arr.length - lines);
    const last = arr.slice(start);
    if (format === "json") {
      return new Response(JSON.stringify({ lines: last }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(last.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    try {
      logError("[admin:logs] error", { message: err?.message ?? String(err), stack: err?.stack ?? null });
    } catch (e) {
    }
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
};
export {
  GET
};
