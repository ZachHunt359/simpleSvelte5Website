import { h as slot, g as bind_props, p as pop, a as push } from "../../chunks/index2.js";
import { s as session } from "../../chunks/session.js";
function _layout($$payload, $$props) {
  push();
  let data = $$props["data"];
  session.user = data.user;
  $$payload.out += `<!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!---->`;
  bind_props($$props, { data });
  pop();
}
export {
  _layout as default
};
