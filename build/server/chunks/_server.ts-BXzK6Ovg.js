import { j as json } from './index-BmA2ZghE.js';
import { g as getUserFromCookies, i as isAdmin } from './helpers-S__xQH7Y.js';
import './cookie-CxBKF6rI.js';
import 'debug';
import 'neverthrow';
import './db-DArO5U0k.js';
import 'better-sqlite3';
import 'path';
import 'mysql2/promise';
import 'bcryptjs';
import 'crypto';

async function GET({ cookies }) {
  try {
    const user = await getUserFromCookies(cookies);
    const admin = await isAdmin(cookies);
    return json({ authenticated: !!user, isAdmin: !!admin, user: user ? { id: user.id, email: user.email } : null });
  } catch (e) {
    return json({ authenticated: false, isAdmin: false, error: String(e) }, { status: 500 });
  }
}

export { GET };
//# sourceMappingURL=_server.ts-BXzK6Ovg.js.map
