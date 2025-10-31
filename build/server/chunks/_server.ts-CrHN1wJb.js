import { j as json } from './index-BmA2ZghE.js';
import { a as logError } from './logger-C0P_e9_2.js';

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

export { GET };
//# sourceMappingURL=_server.ts-CrHN1wJb.js.map
