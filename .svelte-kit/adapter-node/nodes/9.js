import * as server from '../entries/pages/(authenticated)/dashboard/_page.server.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(authenticated)/dashboard/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(authenticated)/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/9.BpR8ouHB.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CB3tKw_3.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/Ds2k93Or.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
export const stylesheets = ["_app/immutable/assets/9.BQmZotTF.css"];
export const fonts = [];
