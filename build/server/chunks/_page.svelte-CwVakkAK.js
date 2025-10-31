import { w as push, K as attr, M as ensure_array_like, I as escape_html, y as pop } from './index2-D9CDRCtq.js';

function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
}
function _page($$payload, $$props) {
  push();
  let query = "";
  let filtered = [];
  let rawMode = false;
  let linesCount = 200;
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c] ?? c);
  }
  function markMatch(s, q) {
    return s;
  }
  function renderLine(line, q) {
    try {
      const obj = JSON.parse(line);
      const ts = escapeHtml(obj.ts ?? "");
      const level = String(obj.level ?? "").toLowerCase();
      const msg = escapeHtml(obj.msg ?? "");
      let meta = "";
      if (obj.meta !== void 0) {
        try {
          meta = escapeHtml(typeof obj.meta === "string" ? obj.meta : JSON.stringify(obj.meta));
        } catch (e) {
          meta = escapeHtml(String(obj.meta));
        }
      }
      const tsHtml = `<span class="ts">${markMatch(ts, q)}</span>`;
      const levelClass = `level level-${escapeHtml(level.replace(/[^a-z0-9_-]/g, ""))}`;
      const levelHtml = `<span class="${levelClass}">${markMatch(escapeHtml(level), q)}</span>`;
      const msgHtml = `<span class="msg">${markMatch(msg, q)}</span>`;
      const metaHtml = meta ? `<span class="meta"> ${markMatch(meta, q)}</span>` : "";
      return `${tsHtml} ${levelHtml} ${msgHtml}${metaHtml}`;
    } catch (e) {
      return markMatch(escapeHtml(line));
    }
  }
  let expanded = /* @__PURE__ */ new Set();
  let parsedObj = {};
  let viewModeObj = {};
  function hashLine(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) + h + s.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }
  $$payload.out += `<section><h2>Server logs</h2> <div style="margin-bottom:0.5rem"><label>Lines: <input type="number"${attr("value", linesCount)}${attr("min", 10)}${attr("max", 2e3)} style="width:6rem"/></label> <button>Refresh</button> <button>Download</button> <button style="margin-left:0.5rem">Select all</button> <label style="margin-left:1rem">Search: <input${attr("value", query)} placeholder="text to highlight"/></label> <label style="margin-left:1rem"><input type="checkbox"${attr("checked", rawMode, true)}/> Raw textarea</label></div> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(filtered);
    $$payload.out += `<div class="log-list-outer svelte-1a9am3l"><div class="log-list svelte-1a9am3l" role="list"><!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let line = each_array[$$index];
      const h = hashLine(line);
      $$payload.out += `<div class="log-entry svelte-1a9am3l" role="listitem"><div class="log-entry-button svelte-1a9am3l" role="button" tabindex="0"${attr("aria-expanded", expanded.has(h))}>`;
      if (expanded.has(h)) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<div class="log-line expanded svelte-1a9am3l">${html(renderLine(line, query))} <div class="expanded-controls svelte-1a9am3l"><button class="svelte-1a9am3l">Copy JSON</button> <button class="svelte-1a9am3l">${escape_html(viewModeObj[h] === "meta" ? "Show Full" : "Show Meta")}</button></div> `;
        if (viewModeObj[h] === "pretty" && parsedObj[h]) {
          $$payload.out += "<!--[-->";
          $$payload.out += `<pre class="json">${escape_html(JSON.stringify(parsedObj[h], null, 2))}</pre>`;
        } else if (viewModeObj[h] === "meta" && parsedObj[h]) {
          $$payload.out += "<!--[1-->";
          $$payload.out += `<pre class="json">${escape_html(JSON.stringify(parsedObj[h].meta ?? parsedObj[h], null, 2))}</pre>`;
        } else {
          $$payload.out += "<!--[!-->";
          $$payload.out += `<pre class="json">${escape_html(line)}</pre>`;
        }
        $$payload.out += `<!--]--></div>`;
      } else {
        $$payload.out += "<!--[!-->";
        $$payload.out += `<div class="log-line svelte-1a9am3l">${html(renderLine(line, query))}</div>`;
      }
      $$payload.out += `<!--]--></div></div>`;
    }
    $$payload.out += `<!--]--></div></div>`;
  }
  $$payload.out += `<!--]--></section>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CwVakkAK.js.map
