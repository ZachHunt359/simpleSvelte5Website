import { w as push, K as attr, M as ensure_array_like, N as attr_class, I as escape_html, O as clsx, G as bind_props, y as pop } from './index2-D9CDRCtq.js';

function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  let email = "";
  function prettyEpoch(ts) {
    if (!ts) return "-";
    try {
      return new Date(ts * 1e3).toLocaleString();
    } catch (e) {
      return String(ts);
    }
  }
  $$payload.out += `<section class="max-w-md mx-auto p-4"><h2>Send Admin Invite</h2> <form><input type="email"${attr("value", email)} placeholder="email@example.com" required/> <button type="submit">Send Invite</button></form> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <h3 style="margin-top:1.25rem">Existing invite codes</h3> `;
  if (data?.invites?.length) {
    $$payload.out += "<!--[-->";
    const each_array = ensure_array_like(data.invites);
    $$payload.out += `<table class="invites-table"><thead><tr><th>Code</th><th>Used</th><th>Created</th><th>UseBy</th><th>UsedAt</th><th>Admin</th><th></th></tr></thead><tbody><!--[-->`;
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let inv = each_array[i];
      $$payload.out += `<tr${attr_class(clsx(i % 2 === 0 ? "even" : "odd"))}><td><div class="code-cell"><code>${escape_html(inv.Code)}</code> <button class="copy-btn" type="button" aria-label="Copy code">📋</button></div></td><td>${escape_html(inv.Used ? "Yes" : "No")}</td><td>${escape_html(prettyEpoch(inv.CreatedAt))}</td><td>${escape_html(prettyEpoch(inv.UseBy))}</td><td>${escape_html(prettyEpoch(inv.UsedAt))}</td><td>${escape_html(inv.AdminEmail ?? "-")}</td><td><button class="delete-btn" type="button" aria-label="Delete invite">🗑️</button></td></tr>`;
    }
    $$payload.out += `<!--]--></tbody></table> <style>
      .invites-table{border-collapse:collapse;margin-top:0.5rem;width:100%}
      .invites-table th,.invites-table td{border:1px solid #ccc;padding:0.4rem 0.6rem;text-align:left}
      .invites-table tr.even{background:#fff}
      .invites-table tr.odd{background:#f7f7f7}
      .invites-table thead th{background:#eee}
        .code-cell{display:flex;align-items:center;gap:0.5rem}
        .copy-btn{background:transparent;border:0;cursor:pointer;padding:0.15rem 0.3rem;border-radius:3px}
        .copy-btn:hover{background:#e6e6e6}
  .delete-btn{background:transparent;border:0;cursor:pointer;padding:0.15rem 0.3rem;border-radius:3px}
  .delete-btn:hover{background:#ffecec}
    </style>`;
  } else {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<p>No invites yet.</p>`;
  }
  $$payload.out += `<!--]--></section>`;
  bind_props($$props, { data });
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DvwZ3Ktd.js.map
