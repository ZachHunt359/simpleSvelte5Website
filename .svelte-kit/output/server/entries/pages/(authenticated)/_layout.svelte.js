import { d as escape_html, h as slot, g as bind_props, p as pop, a as push } from "../../../chunks/index2.js";
function _layout($$payload, $$props) {
  push();
  let data = $$props["data"];
  $$payload.out += `<nav class="topnav svelte-175vtoi"><div class="logo svelte-175vtoi">PARANOiD Admin</div> <div class="navlinks svelte-175vtoi"><a href="/dashboard" class="svelte-175vtoi">Inquiries</a> <a href="/archive" class="svelte-175vtoi">Archive</a> <a href="/upload" class="svelte-175vtoi">Upload</a> `;
  if (data.isAdmin) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<a href="/admin/logs" class="svelte-175vtoi">Logs</a> <a href="/admin/invite" class="svelte-175vtoi">Invite</a>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div> <div class="user">`;
  if (data.user?.email) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<span class="username">${escape_html(data.user.email)}</span> <form method="POST" action="?/logout" style="display:inline;margin-left:0.5rem;"><button class="btn btn-error btn-sm" type="submit">Logout</button></form>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div></nav> <main class="svelte-175vtoi"><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----></main>`;
  bind_props($$props, { data });
  pop();
}
export {
  _layout as default
};
