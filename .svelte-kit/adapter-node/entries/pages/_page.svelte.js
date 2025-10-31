import "clsx";
import { p as pop, a as push } from "../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "../../chunks/state.svelte.js";
function _page($$payload, $$props) {
  push();
  $$payload.out += `<p>Redirecting...</p>`;
  pop();
}
export {
  _page as default
};
