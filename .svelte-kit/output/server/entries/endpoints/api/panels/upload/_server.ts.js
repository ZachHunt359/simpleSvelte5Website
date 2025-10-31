import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { i as isAdmin } from "../../../../../chunks/helpers.js";
import { a as logError } from "../../../../../chunks/logger.js";
const PANELS_DIR = path.resolve("static/panels");
const POST = async ({ request, cookies }) => {
  if (!await isAdmin(cookies)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const formData = await request.formData();
  const files = formData.getAll("files");
  if (!files.length) {
    return new Response(JSON.stringify({ error: "No files uploaded" }), { status: 400 });
  }
  try {
    for (const file of files) {
      const relPath = file.name;
      const destPath = path.join(PANELS_DIR, relPath);
      const destDir = path.dirname(destPath);
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(destPath, Buffer.from(arrayBuffer));
    }
    return new Response(JSON.stringify({ success: true, message: "Files uploaded" }), { status: 200 });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[panels:upload] error", { stack });
    return new Response(JSON.stringify({ error: "Upload failed", __fallbackError: "Upload failed (see server logs)" }), { status: 500 });
  }
};
export {
  POST
};
