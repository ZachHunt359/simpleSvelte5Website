import { json } from "@sveltejs/kit";
import { a as logError } from "../../../../chunks/logger.js";
const GET = (event) => {
  try {
    const user = event.locals?.user;
    if (!user) return json({ error: "not authorized" }, { status: 401 });
    return json({ id: user.id, email: user.email });
  } catch (err) {
    const stack = err && err.stack ? err.stack : String(err);
    logError("[api/me] GET error", { stack });
    return json({ error: "Server error", __fallbackError: "Failed to load user (see server logs)" }, { status: 500 });
  }
};
export {
  GET
};
