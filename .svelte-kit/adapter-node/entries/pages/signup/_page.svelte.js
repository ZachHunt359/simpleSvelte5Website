import { d as escape_html, b as attr, g as bind_props, p as pop, a as push } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "../../../chunks/state.svelte.js";
import { faWarning } from "@fortawesome/free-solid-svg-icons";
import { F as Fa } from "../../../chunks/fa.js";
import debug from "debug";
import "../../../chunks/session.js";
function _page($$payload, $$props) {
  push();
  debug("app:routes:signup:page.svelte");
  let form = $$props["form"];
  $$payload.out += `<section class="max-w-sm mx-auto"><div class="prose"><h1>Sign Up</h1></div> <form class="flex flex-col gap-6 my-6" method="POST">`;
  if (form?.error) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="alert alert-error"><div>`;
    Fa($$payload, { icon: faWarning });
    $$payload.out += `<!----> ${escape_html(form.error)}</div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <p><input type="email" name="email" placeholder="Email..." class="input input-bordered w-full" required${attr("value", form?.email ?? "")}/></p> <p><input type="password" name="password" placeholder="Password..." class="input input-bordered w-full" required/></p> <p><input type="password" name="password-confirm" placeholder="Confirm password..." class="input input-bordered w-full" required/></p> <p class="flex items-center gap-6 mt-6"><button class="btn btn-primary">Sign Up</button> or <a href="/login" class="link">Log In</a></p></form> `;
  if (form) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<section class="my-8"><h3>Form data:</h3> <pre>${escape_html(JSON.stringify(form, null, 2))}</pre></section>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></section>`;
  bind_props($$props, { form });
  pop();
}
export {
  _page as default
};
