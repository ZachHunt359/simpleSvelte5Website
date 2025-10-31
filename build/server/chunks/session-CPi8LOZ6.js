import debug from 'debug';
import { w as writable } from './index-M2yWp0tZ.js';

const log = debug("app:lib:stores:session");
const session = writable({ user: null });
session.subscribe((session2) => log("session:", session2));

export { session as s };
//# sourceMappingURL=session-CPi8LOZ6.js.map
