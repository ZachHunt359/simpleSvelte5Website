import { d as escape_html, b as attr, g as bind_props, p as pop, a as push } from "../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  let email = "";
  let password = "";
  let code = data?.code ?? "";
  $$payload.out += `<section class="max-w-md mx-auto p-4"><h1>Register (admin invite)</h1> `;
  if (data?.error) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<p class="text-red-600">${escape_html(data.error)}</p>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <form method="post"><input type="hidden" name="code"${attr("value", code)}/> <div><label for="email">Email</label> <input id="email" type="email" name="email"${attr("value", email)} required/></div> <div><label for="password">Password</label> <input id="password" type="password" name="password"${attr("value", password)} required minlength="8"/></div> <button type="submit">Create account</button></form></section>`;
  bind_props($$props, { data });
  pop();
}
export {
  _page as default
};
