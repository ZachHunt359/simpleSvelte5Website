import { w as push, I as escape_html, K as attr, G as bind_props, y as pop } from './index2-D9CDRCtq.js';
import './utils-DJ7c8cmr.js';
import './state.svelte-DFoohMZm.js';
import './session-CPi8LOZ6.js';
import { faWarning } from '@fortawesome/free-solid-svg-icons';
import debug from 'debug';
import { F as Fa } from './fa-CVQIM4-J.js';
import './index-M2yWp0tZ.js';

function _page($$payload, $$props) {
  push();
  const log = debug("app:routes:login:page.svelte");
  let form = $$props["form"];
  log("form:", form);
  $$payload.out += `<section class="max-w-sm mx-auto"><form class="flex flex-col gap-6 my-6" method="POST">`;
  if (form?.error) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="alert alert-error"><div>`;
    Fa($$payload, { icon: faWarning });
    $$payload.out += `<!----> ${escape_html(form.error)}</div></div>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <p><input autocomplete="email" autocorrect="off" type="email" name="email" placeholder="Email..." class="input input-bordered w-full" required${attr("value", form?.email ?? "")}/></p> <p><input autocomplete="current-password" type="password" name="password" placeholder="Password..." class="input input-bordered w-full" required/></p> <p class="flex items-center gap-6 mt-6"><button class="btn btn-primary">Log In</button> or <a href="/signup" class="link">Sign Up</a></p></form> `;
  if (form) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<section class="my-12 prose"><h3>Form data:</h3> <pre>${escape_html(JSON.stringify(form, null, 2))}</pre></section>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></section>`;
  bind_props($$props, { form });
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DbaxF1un.js.map
