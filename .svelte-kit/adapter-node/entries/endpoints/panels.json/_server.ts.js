import fs from "fs/promises";
import path from "path";
const GET = async () => {
  try {
    const file = path.join(process.cwd(), "static", "panels.json");
    const data = await fs.readFile(file, "utf8");
    return new Response(data, { headers: { "content-type": "application/json" } });
  } catch (err) {
    console.error("Failed to read panels.json", err);
    return new Response(JSON.stringify({ error: "panels.json not found" }), { status: 404, headers: { "content-type": "application/json" } });
  }
};
export {
  GET
};
