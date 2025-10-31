import * as server from '../entries/pages/(authenticated)/archive/_page.server.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(authenticated)/archive/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(authenticated)/archive/+page.server.ts";
export const imports = ["_app/immutable/nodes/8.taWdZvMd.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/DzUKuoAr.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/EyRQZfWT.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CB3tKw_3.js","_app/immutable/chunks/C58Ab5CP.js","_app/immutable/chunks/Ds2k93Or.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
export const stylesheets = ["_app/immutable/assets/8.DrGe7rKu.css"];
export const fonts = [];
