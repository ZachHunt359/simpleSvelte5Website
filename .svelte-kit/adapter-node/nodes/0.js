import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.CzKW9C8v.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/BsNfQ5Ie.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/Bi7TOvI8.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js","_app/immutable/chunks/DmIcBnwA.js"];
export const stylesheets = ["_app/immutable/assets/0.BgzqMfpp.css"];
export const fonts = [];
