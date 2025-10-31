import { w as push, M as ensure_array_like, I as escape_html, G as bind_props, y as pop } from './index2-D9CDRCtq.js';

function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  const migrations = data.migrations ?? [];
  function fmt(ts) {
    if (!ts) return "not applied";
    try {
      return new Date(ts * 1e3).toISOString();
    } catch (e) {
      return String(ts);
    }
  }
  $$payload.out += `<h1>Migrations Status</h1> `;
  if (migrations.length === 0) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<p>No migration files found.</p>`;
  } else {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(migrations);
    $$payload.out += `<table><thead><tr><th>Migration</th><th>Applied At</th></tr></thead><tbody><!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let m = each_array[$$index];
      $$payload.out += `<tr><td>${escape_html(m.name)}</td><td>${escape_html(fmt(m.appliedAt))}</td></tr>`;
    }
    $$payload.out += `<!--]--></tbody></table>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { data });
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BbTqKwvJ.js.map
