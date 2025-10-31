import { w as push, I as escape_html, y as pop, J as getContext } from './index2-D9CDRCtq.js';
import './state.svelte-DFoohMZm.js';
import { s as stores } from './client-BR1wRiWL.js';
import './utils-DJ7c8cmr.js';
import './index-M2yWp0tZ.js';

({
  check: stores.updated.check
});
function context() {
  return getContext("__request__");
}
const page$1 = {
  get error() {
    return context().page.error;
  },
  get status() {
    return context().page.status;
  }
};
const page = page$1;
function Error$1($$payload, $$props) {
  push();
  $$payload.out += `<h1>${escape_html(page.status)}</h1> <p>${escape_html(page.error?.message)}</p>`;
  pop();
}

export { Error$1 as default };
//# sourceMappingURL=error.svelte-Dbq8AyyK.js.map
