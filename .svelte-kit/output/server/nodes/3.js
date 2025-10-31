import * as server from '../entries/pages/(authenticated)/admin/_layout.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(authenticated)/admin/+layout.server.ts";
export const imports = ["_app/immutable/nodes/3.BDnJAglo.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/EyRQZfWT.js"];
export const stylesheets = [];
export const fonts = [];
