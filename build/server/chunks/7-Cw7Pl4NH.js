const load = async ({ fetch }) => {
  const res = await fetch("/(authenticated)/admin/migrations");
  if (!res.ok) {
    return { migrations: [] };
  }
  const body = await res.json();
  return { migrations: body.migrations || [] };
};
const prerender = false;

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load,
  prerender: prerender
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BbTqKwvJ.js')).default;
const server_id = "src/routes/(authenticated)/admin/migrations/+page.server.ts";
const imports = ["_app/immutable/nodes/7.D8pUW9c_.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CVU9J4tU.js","_app/immutable/chunks/BrOmHN9R.js","_app/immutable/chunks/fd9q9ptE.js","_app/immutable/chunks/BlxHWswI.js","_app/immutable/chunks/CB3tKw_3.js","_app/immutable/chunks/DcBb0i4c.js","_app/immutable/chunks/CagC-Rjn.js","_app/immutable/chunks/Ujwe2Jf3.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-Cw7Pl4NH.js.map
