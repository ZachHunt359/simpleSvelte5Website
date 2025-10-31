import { w as push, P as fallback, K as attr, N as attr_class, Q as attr_style, R as stringify, G as bind_props, y as pop } from './index2-D9CDRCtq.js';

const parseNumber = parseFloat;
function joinCss(obj, separator = ";") {
  let texts;
  if (Array.isArray(obj)) {
    texts = obj.filter((text) => text);
  } else {
    texts = [];
    for (const prop in obj) {
      if (obj[prop]) {
        texts.push(`${prop}:${obj[prop]}`);
      }
    }
  }
  return texts.join(separator);
}
function getStyles(style, size, pull, fw) {
  let float;
  let width;
  const height = "1em";
  let lineHeight;
  let fontSize;
  let textAlign;
  let verticalAlign = "-.125em";
  const overflow = "visible";
  if (fw) {
    textAlign = "center";
    width = "1.25em";
  }
  if (pull) {
    float = pull;
  }
  if (size) {
    if (size == "lg") {
      fontSize = "1.33333em";
      lineHeight = ".75em";
      verticalAlign = "-.225em";
    } else if (size == "xs") {
      fontSize = ".75em";
    } else if (size == "sm") {
      fontSize = ".875em";
    } else {
      fontSize = size.replace("x", "em");
    }
  }
  return joinCss([
    joinCss({
      float,
      width,
      height,
      "line-height": lineHeight,
      "font-size": fontSize,
      "text-align": textAlign,
      "vertical-align": verticalAlign,
      "transform-origin": "center",
      overflow
    }),
    style
  ]);
}
function getTransform(scale, translateX, translateY, rotate, flip, translateTimes = 1, translateUnit = "", rotateUnit = "") {
  let flipX = 1;
  let flipY = 1;
  if (flip) {
    if (flip == "horizontal") {
      flipX = -1;
    } else if (flip == "vertical") {
      flipY = -1;
    } else {
      flipX = flipY = -1;
    }
  }
  return joinCss(
    [
      `translate(${parseNumber(translateX) * translateTimes}${translateUnit},${parseNumber(translateY) * translateTimes}${translateUnit})`,
      `scale(${flipX * parseNumber(scale)},${flipY * parseNumber(scale)})`,
      rotate && `rotate(${rotate}${rotateUnit})`
    ],
    " "
  );
}
function Fa($$payload, $$props) {
  push();
  let clazz = fallback($$props["class"], "");
  let id = fallback($$props["id"], "");
  let style = fallback($$props["style"], "");
  let icon = $$props["icon"];
  let size = fallback($$props["size"], "");
  let color = fallback($$props["color"], "");
  let fw = fallback($$props["fw"], false);
  let pull = fallback($$props["pull"], "");
  let scale = fallback($$props["scale"], 1);
  let translateX = fallback($$props["translateX"], 0);
  let translateY = fallback($$props["translateY"], 0);
  let rotate = fallback($$props["rotate"], "");
  let flip = fallback($$props["flip"], false);
  let spin = fallback($$props["spin"], false);
  let pulse = fallback($$props["pulse"], false);
  let primaryColor = fallback($$props["primaryColor"], "");
  let secondaryColor = fallback($$props["secondaryColor"], "");
  let primaryOpacity = fallback($$props["primaryOpacity"], 1);
  let secondaryOpacity = fallback($$props["secondaryOpacity"], 0.4);
  let swapOpacity = fallback($$props["swapOpacity"], false);
  let i;
  let s;
  let transform;
  i = icon && icon.icon || [0, 0, "", [], ""];
  s = getStyles(style, size, pull, fw);
  transform = getTransform(scale, translateX, translateY, rotate, flip, 512);
  if (i[4]) {
    $$payload.out += "<!--[-->";
    $$payload.out += `<svg${attr("id", id || void 0)}${attr_class(`svelte-fa ${stringify(clazz)}`, "svelte-1cj2gr0", { "pulse": pulse, "spin": spin })}${attr_style(s)}${attr("viewBox", `0 0 ${stringify(i[0])} ${stringify(i[1])}`)} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"><g${attr("transform", `translate(${stringify(i[0] / 2)} ${stringify(i[1] / 2)})`)}${attr("transform-origin", `${stringify(i[0] / 4)} 0`)} class="svelte-1cj2gr0"><g${attr("transform", transform)} class="svelte-1cj2gr0">`;
    if (typeof i[4] == "string") {
      $$payload.out += "<!--[-->";
      $$payload.out += `<path${attr("d", i[4])}${attr("fill", color || primaryColor || "currentColor")}${attr("transform", `translate(${stringify(i[0] / -2)} ${stringify(i[1] / -2)})`)} class="svelte-1cj2gr0"></path>`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<path${attr("d", i[4][0])}${attr("fill", secondaryColor || color || "currentColor")}${attr("fill-opacity", swapOpacity != false ? primaryOpacity : secondaryOpacity)}${attr("transform", `translate(${stringify(i[0] / -2)} ${stringify(i[1] / -2)})`)} class="svelte-1cj2gr0"></path><path${attr("d", i[4][1])}${attr("fill", primaryColor || color || "currentColor")}${attr("fill-opacity", swapOpacity != false ? secondaryOpacity : primaryOpacity)}${attr("transform", `translate(${stringify(i[0] / -2)} ${stringify(i[1] / -2)})`)} class="svelte-1cj2gr0"></path>`;
    }
    $$payload.out += `<!--]--></g></g></svg>`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, {
    class: clazz,
    id,
    style,
    icon,
    size,
    color,
    fw,
    pull,
    scale,
    translateX,
    translateY,
    rotate,
    flip,
    spin,
    pulse,
    primaryColor,
    secondaryColor,
    primaryOpacity,
    secondaryOpacity,
    swapOpacity
  });
  pop();
}

export { Fa as F };
//# sourceMappingURL=fa-CVQIM4-J.js.map
