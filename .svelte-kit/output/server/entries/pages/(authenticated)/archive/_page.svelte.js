import { b as attr, e as ensure_array_like, d as escape_html, g as bind_props, p as pop, a as push } from "../../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  let q = data.q || "";
  let page = data.page || 1;
  let perPage = data.perPage || 20;
  let total = data.total || 0;
  let archived = data.archived || [];
  let bulkDays = 30;
  $$payload.out += `<section class="prose archive svelte-dkykc2"><h1>Sent / Archive</h1> <div class="archive-controls svelte-dkykc2" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;"><input placeholder="Search (email, reply text, message id)"${attr("value", q)} class="input input-bordered svelte-dkykc2"/> <button class="btn btn-primary">Search</button> <div style="margin-left:auto;display:flex;gap:0.5rem;align-items:center;"><input type="number" min="1"${attr("value", bulkDays)} style="width:4.5rem;padding:0.25rem" class="svelte-dkykc2"/> <button class="btn btn-warning">Delete all older than days</button></div></div> `;
  if (!archived || archived.length === 0) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<p>No sent inquiries yet.</p>`;
  } else {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(archived);
    $$payload.out += `<div class="archive-list svelte-dkykc2"><!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let a = each_array[$$index];
      $$payload.out += `<div class="archive-card svelte-dkykc2"><div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>Id:</strong> ${escape_html(a.id)}</div> <div><button class="btn btn-xs">Copy Message-ID</button> <button class="btn btn-xs" style="margin-left:0.5rem;">Resend</button> <button class="btn btn-error btn-xs" style="margin-left:0.5rem;">Delete</button></div></div> <div><strong>Email:</strong> ${escape_html(a.email)}</div> <div><strong>Reply:</strong> ${escape_html(a.reply)}</div> <div><strong>Message-ID:</strong> <code>${escape_html(a.messageId)}</code></div> <div><strong>Reply at:</strong> ${escape_html(a.replyTimestamp ? new Date(a.replyTimestamp * 1e3).toLocaleString() : "—")}</div></div>`;
    }
    $$payload.out += `<!--]--></div> <div class="pagination" style="margin-top:1rem;display:flex;gap:0.5rem;align-items:center;"><button class="btn btn-sm"${attr("disabled", page <= 1, true)}>Prev</button> <div>Page ${escape_html(page)} — showing ${escape_html(archived.length)} of ${escape_html(total)}</div> <button class="btn btn-sm"${attr("disabled", page * perPage >= total, true)}>Next</button></div>`;
  }
  $$payload.out += `<!--]--></section>`;
  bind_props($$props, { data });
  pop();
}
export {
  _page as default
};
