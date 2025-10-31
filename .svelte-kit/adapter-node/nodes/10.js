import * as universal from '../entries/pages/(authenticated)/settings/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(authenticated)/settings/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/(authenticated)/settings/+page.ts";
export const imports = ["_app/immutable/nodes/10.B1MJ4yYH.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js"];
export const stylesheets = [];
export const fonts = [];
