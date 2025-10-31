import { e as ensure_array_like, d as escape_html, b as attr, g as bind_props, p as pop, a as push } from "../../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  let inquiries = [];
  let replyText = {};
  let sending = {};
  let error = {};
  let editing = {};
  function pageSentFromToHref(s) {
    if (!s) return "#";
    const trimmed = s.replace(/^\/+/, "").replace(/\/+$/, "");
    return "/" + encodeURI(trimmed);
  }
  function formatDate(ts) {
    const d = typeof ts === "number" ? new Date(ts * 1e3) : new Date(ts);
    return d.toLocaleString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  inquiries = data.inquiries ?? [];
  $$payload.out += `<section class="prose inbox svelte-1nrap25"><h1>Inbox</h1> `;
  if (!data.inquiries || data.inquiries.length === 0) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<p>No inquiries yet.</p>`;
  } else {
    $$payload.out += "<!--[!-->";
    const each_array = ensure_array_like(inquiries);
    $$payload.out += `<div class="inbox-list svelte-1nrap25"><!--[-->`;
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let inquiry = each_array[$$index];
      $$payload.out += `<div class="inquiry-card svelte-1nrap25"><div class="inquiry-header svelte-1nrap25"><span class="user-id svelte-1nrap25">User: <code class="svelte-1nrap25">${escape_html(inquiry.userId)}</code></span> `;
      if (inquiry.pageSentFrom) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<span class="from">from: <a${attr("href", pageSentFromToHref(inquiry.pageSentFrom))} target="_blank" rel="noopener noreferrer"><code>${escape_html(inquiry.pageSentFrom)}</code></a></span>`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--> <span class="timestamp svelte-1nrap25">${escape_html(formatDate(inquiry.timestamp))}</span></div> <div class="inquiry-meta svelte-1nrap25"><span>`;
      if (inquiry.email) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<strong>Email:</strong> ${escape_html(inquiry.email)}`;
      } else {
        $$payload.out += "<!--[!-->";
      }
      $$payload.out += `<!--]--></span></div> <div class="inquiry-message svelte-1nrap25"><strong>Q:</strong> ${escape_html(inquiry.message)}</div> `;
      if (inquiry.reply && !editing[inquiry.id]) {
        $$payload.out += "<!--[-->";
        $$payload.out += `<div class="inquiry-reply svelte-1nrap25"><strong>Reply:</strong> ${escape_html(inquiry.reply)} <button class="btn btn-secondary btn-xs" style="margin-left:1em">Edit Reply</button> `;
        if (inquiry.email) {
          $$payload.out += "<!--[-->";
          $$payload.out += `<button class="btn btn-success btn-xs" style="margin-left:1em">Send Email</button>`;
        } else {
          $$payload.out += "<!--[!-->";
        }
        $$payload.out += `<!--]--></div>`;
      } else {
        $$payload.out += "<!--[!-->";
        $$payload.out += `<div class="inquiry-reply-form svelte-1nrap25"><textarea rows="2" placeholder="Type your reply..." class="input input-bordered w-full">`;
        const $$body = escape_html(replyText[inquiry.id]);
        if ($$body) {
          $$payload.out += `${$$body}`;
        }
        $$payload.out += `</textarea> <button class="btn btn-primary"${attr("disabled", sending[inquiry.id], true)}>${escape_html(sending[inquiry.id] ? "Saving..." : "Save Reply")}</button> `;
        if (error[inquiry.id]) {
          $$payload.out += "<!--[-->";
          $$payload.out += `<span class="error svelte-1nrap25">${escape_html(error[inquiry.id])}</span>`;
        } else {
          $$payload.out += "<!--[!-->";
        }
        $$payload.out += `<!--]--></div>`;
      }
      $$payload.out += `<!--]--></div>`;
    }
    $$payload.out += `<!--]--></div>`;
  }
  $$payload.out += `<!--]--></section>`;
  bind_props($$props, { data });
  pop();
}
export {
  _page as default
};
