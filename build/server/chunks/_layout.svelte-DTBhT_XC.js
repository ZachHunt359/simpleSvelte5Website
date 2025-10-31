import { w as push, F as slot, G as bind_props, y as pop } from './index2-D9CDRCtq.js';
import { s as session } from './session-CPi8LOZ6.js';
import 'debug';
import './index-M2yWp0tZ.js';

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

export { _layout as default };
//# sourceMappingURL=_layout.svelte-DTBhT_XC.js.map
