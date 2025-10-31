import { a as push, i as fallback, c as attr_class, j as attr_style, b as attr, g as bind_props, p as pop, k as stringify, l as getContext, m as store_get, o as copy_payload, q as assign_payload, u as unsubscribe_stores, e as ensure_array_like, d as escape_html } from "../../../../chunks/index2.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "../../../../chunks/state.svelte.js";
import { g as goto } from "../../../../chunks/client.js";
async function tick() {
}
function TopNav($$payload, $$props) {
  push();
  let show = fallback($$props["show"], false);
  let isDesktop = fallback($$props["isDesktop"], false);
  let onChapterSelect = fallback($$props["onChapterSelect"], () => {
  });
  let chaptersCount = fallback($$props["chaptersCount"], 1);
  let canGoForward = fallback($$props["canGoForward"], false);
  let onInquiry = fallback($$props["onInquiry"], () => {
  });
  let hasUnreadReplies = fallback($$props["hasUnreadReplies"], false);
  $$payload.out += `<nav${attr_class("top-nav svelte-dgwkgh", void 0, { "show": show })}${attr_style(`pointer-events: ${stringify(show ? "auto" : "none")}`)}><ul class="svelte-dgwkgh"><li class="svelte-dgwkgh"><a href="/#" aria-label="Discord link" class="svelte-dgwkgh"><iconify-icon icon="mdi:discord" class="svelte-dgwkgh"></iconify-icon></a></li> <li class="svelte-dgwkgh"><a href="/#" aria-label="Patreon link" class="svelte-dgwkgh"><iconify-icon icon="simple-icons:patreon" class="svelte-dgwkgh"></iconify-icon></a></li> <li class="svelte-dgwkgh"><button class="logo svelte-dgwkgh" type="button" aria-label="Select Chapter"${attr("aria-disabled", chaptersCount <= 1)}${attr("tabindex", chaptersCount > 1 ? 0 : -1)}>PARANOiD</button></li> <li class="svelte-dgwkgh"><button type="button" aria-label="Notifications"${attr_class("svelte-dgwkgh", void 0, { "notify": hasUnreadReplies })}><iconify-icon icon="mdi:bell-outline" class="svelte-dgwkgh"></iconify-icon></button></li> <li class="svelte-dgwkgh"><button type="button"${attr("aria-disabled", canGoForward)}${attr("tabindex", canGoForward ? -1 : 0)} aria-label="Open inquiry dialog"${attr_class("svelte-dgwkgh", void 0, { "disabled": canGoForward })}><iconify-icon icon="lineicons:question-mark" class="svelte-dgwkgh"></iconify-icon></button></li></ul></nav>`;
  bind_props($$props, {
    show,
    isDesktop,
    onChapterSelect,
    chaptersCount,
    canGoForward,
    onInquiry,
    hasUnreadReplies
  });
  pop();
}
function BottomNav($$payload, $$props) {
  push();
  let canGoBack = fallback($$props["canGoBack"], false);
  let canGoForward = fallback($$props["canGoForward"], false);
  let onBack = fallback($$props["onBack"], () => {
  });
  let onForward = fallback($$props["onForward"], () => {
  });
  let onFirst = fallback($$props["onFirst"], () => {
  });
  let show = fallback($$props["show"], false);
  let isDesktop = fallback($$props["isDesktop"], false);
  let onChapterSelect = fallback($$props["onChapterSelect"], () => {
  });
  let chaptersCount = fallback($$props["chaptersCount"], 1);
  let onSave = fallback($$props["onSave"], () => {
  });
  let isSaved = fallback($$props["isSaved"], false);
  $$payload.out += `<nav${attr_class("bottom-nav", void 0, { "show": show })}><ul><li><button type="button" aria-label="Go to first panel" class="svelte-1hdu4j3"><iconify-icon icon="icon-park-outline:to-left"></iconify-icon></button></li> <li><button type="button"${attr("aria-disabled", !canGoBack)}${attr("tabindex", canGoBack ? 0 : -1)} aria-label="Back one panel"${attr_class("svelte-1hdu4j3", void 0, { "disabled": !canGoBack })}><iconify-icon icon="icon-park-outline:left-two"></iconify-icon></button></li> <li><button type="button"${attr("aria-disabled", chaptersCount <= 1)}${attr("tabindex", chaptersCount > 1 ? 0 : -1)} aria-label="Select Chapter"${attr_class("svelte-1hdu4j3", void 0, { "disabled": chaptersCount <= 1 })}><iconify-icon icon="uil:books"></iconify-icon></button></li> <li><button type="button"${attr("aria-disabled", !canGoForward)}${attr("tabindex", canGoForward ? 0 : -1)} aria-label="Forward one panel"${attr_class("svelte-1hdu4j3", void 0, { "disabled": !canGoForward })}><iconify-icon icon="icon-park-outline:right-two"></iconify-icon></button></li> <li><button type="button" aria-label="Save Location"${attr("disabled", isSaved, true)}${attr_class("svelte-1hdu4j3", void 0, { "saved": isSaved })}><iconify-icon icon="bi:floppy"></iconify-icon></button></li></ul></nav>`;
  bind_props($$props, {
    canGoBack,
    canGoForward,
    onBack,
    onForward,
    onFirst,
    show,
    isDesktop,
    onChapterSelect,
    chaptersCount,
    onSave,
    isSaved
  });
  pop();
}
function ComicPanel($$payload, $$props) {
  push();
  let panels = fallback($$props["panels"], () => [], true);
  let currentPanel = fallback($$props["currentPanel"], 0);
  let lastScroll = fallback($$props["lastScroll"], 0);
  let onNext = fallback($$props["onNext"], () => {
  });
  let displayedPanelIndex = currentPanel;
  let preloading = false;
  let onSwipeUp = fallback($$props["onSwipeUp"], () => {
  });
  let onSwipeDown = fallback($$props["onSwipeDown"], () => {
  });
  if (panels.length > 0 && currentPanel !== displayedPanelIndex && panels[currentPanel]) {
    const url = panels[currentPanel];
    preloading = true;
    if (/\.(webm)$/i.test(url)) {
      displayedPanelIndex = currentPanel;
      preloading = false;
    } else {
      const img = new window.Image();
      img.onload = () => {
        displayedPanelIndex = currentPanel;
        preloading = false;
      };
      img.src = url;
    }
  }
  $$payload.out += `<button class="comic-area svelte-18c54bn" type="button"${attr_style(`min-height: ${stringify("auto")}`)}${attr("disabled", preloading, true)}>`;
  if (panels.length > 0 && displayedPanelIndex >= 0 && displayedPanelIndex < panels.length) {
    $$payload.out += "<!--[-->";
    if (/\.(webm)$/i.test(panels[displayedPanelIndex])) {
      $$payload.out += "<!--[-->";
      $$payload.out += `<video${attr("src", panels[displayedPanelIndex])} autoplay loop playsinline aria-hidden="true" tabindex="-1" class="svelte-18c54bn"></video>`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<img${attr("src", panels[displayedPanelIndex])} alt="Comic Panel" draggable="false" class="svelte-18c54bn"/>`;
    }
    $$payload.out += `<!--]-->`;
  } else {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></button>`;
  bind_props($$props, {
    panels,
    currentPanel,
    lastScroll,
    onNext,
    onSwipeUp,
    onSwipeDown
  });
  pop();
}
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let chapters = [];
  let panels = [];
  let currentChapter = 0;
  let currentPanel = 0;
  let isPointerDesktop = false;
  let isSaved = false;
  let lastScroll = 0;
  let showTopNav = false;
  let showBottomNav = false;
  let bottomNavTimeout = null;
  let topNavTimeout = null;
  let showChapterModal = false;
  let hasUnreadReplies = false;
  function buildPanelsForChapter(chapterIdx, desktopMode) {
    const chap = chapters[chapterIdx] ?? { desktop: [], mobile: [] };
    const desktopArr = chap.desktop ?? [];
    const mobileArr = chap.mobile ?? [];
    const maxLen = Math.max(desktopArr.length, mobileArr.length);
    const out = [];
    for (let i = 0; i < maxLen; i++) {
      const d = desktopArr[i] ?? null;
      const m = mobileArr[i] ?? null;
      const chosen = m ?? d;
      if (chosen) out.push(chosen);
    }
    return out;
  }
  function next() {
    if (currentPanel < (panels?.length ?? 0) - 1) {
      lastScroll = window.scrollY;
      currentPanel += 1;
      blurActiveElement();
      return true;
    }
    if (currentChapter < chapters.length - 1) {
      currentChapter += 1;
      currentPanel = 0;
      lastScroll = 0;
      blurActiveElement();
      return true;
    }
    return false;
  }
  function prev() {
    if (currentPanel > 0) {
      lastScroll = window.scrollY;
      currentPanel -= 1;
      blurActiveElement();
      return true;
    }
    if (currentChapter > 0) {
      currentChapter -= 1;
      const prevPanels = buildPanelsForChapter(currentChapter);
      currentPanel = prevPanels.length - 1;
      lastScroll = 0;
      blurActiveElement();
      return true;
    }
    return false;
  }
  function first() {
    if (currentPanel !== 0) {
      currentPanel = 0;
      lastScroll = 0;
      blurActiveElement();
      return true;
    }
    return false;
  }
  function showNav(setter, timeoutVar) {
    setter(true);
    if (timeoutVar === "bottom") {
      if (bottomNavTimeout) clearTimeout(bottomNavTimeout);
      bottomNavTimeout = setTimeout(
        () => {
          setter(false);
          const nav = document.querySelector(".bottom-nav.show");
          if (nav && nav.contains(document.activeElement)) {
            document.activeElement.blur();
          }
        },
        5e3
      );
    } else {
      if (topNavTimeout) clearTimeout(topNavTimeout);
      topNavTimeout = setTimeout(
        () => {
          setter(false);
          const nav = document.querySelector(".top-nav.show");
          if (nav && nav.contains(document.activeElement)) {
            document.activeElement.blur();
          }
        },
        5e3
      );
    }
  }
  function handleSwipeUp() {
    showNav((v) => showBottomNav = v, "bottom");
  }
  function handleSwipeDown() {
    showNav((v) => showTopNav = v, "top");
  }
  function withNavTimer(fn, nav) {
    return () => {
      const didChange = fn();
      if (didChange) {
        showNav((v) => showBottomNav = v, nav);
      }
    };
  }
  function blurActiveElement() {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
  let prevPanel = currentPanel;
  let lastParams = { chapter: null, panel: null };
  function saveLocation() {
    if (typeof window !== "undefined") {
      localStorage.setItem("comic-last-url", window.location.pathname);
      isSaved = true;
    }
  }
  let inquiryText = "";
  let showInquiryModal = false;
  let lastFocused = null;
  function saveFocus() {
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active) lastFocused = active;
    }
  }
  function restoreFocus() {
    if (lastFocused) {
      try {
        lastFocused.focus();
      } catch (e) {
      }
      lastFocused = null;
    }
  }
  function trapFocus(container) {
    return void 0;
  }
  let chapterRelease = void 0;
  let inquiryRelease = void 0;
  {
    const params = store_get($$store_subs ??= {}, "$page", page).params;
    params.chapter ?? "";
    params.panel ?? "";
    if (typeof window !== "undefined") {
      isSaved = localStorage.getItem("comic-last-url") === window.location.pathname;
    }
  }
  if (chapters.length > 0 && store_get($$store_subs ??= {}, "$page", page).params.chapter && store_get($$store_subs ??= {}, "$page", page).params.panel && (store_get($$store_subs ??= {}, "$page", page).params.chapter !== lastParams.chapter || store_get($$store_subs ??= {}, "$page", page).params.panel !== lastParams.panel)) {
    const chapterSlug = store_get($$store_subs ??= {}, "$page", page).params.chapter;
    const panelFile = store_get($$store_subs ??= {}, "$page", page).params.panel;
    const chapterIdx = chapters.findIndex((c) => c.slug === chapterSlug);
    if (chapterIdx !== -1) {
      currentChapter = chapterIdx;
      const newPanels = buildPanelsForChapter(chapterIdx);
      const panelIdx = newPanels.findIndex((p) => p.includes(panelFile));
      if (panelIdx !== -1) {
        currentPanel = panelIdx;
      }
    }
    lastParams = { chapter: chapterSlug, panel: panelFile };
  }
  panels = chapters.length > 0 ? buildPanelsForChapter(currentChapter) : [];
  {
    if (panels.length === 0) {
      currentPanel = 0;
    } else if (currentPanel < 0) {
      currentPanel = 0;
    } else if (currentPanel >= panels.length) {
      currentPanel = panels.length - 1;
    }
  }
  currentChapter === chapters.length - 1 && currentPanel === (panels?.length ?? 0) - 1;
  (async () => {
    if (currentPanel === 0 && prevPanel !== 0) {
      if (typeof window !== "undefined") {
        await tick();
      }
    }
    prevPanel = currentPanel;
  })();
  if (chapters.length > 0 && panels.length > 0 && currentChapter >= 0 && currentPanel >= 0) {
    const chapterSlug = chapters[currentChapter]?.slug;
    const panelFile = panels[currentPanel]?.split("/").pop()?.replace(/\.[^/.]+$/, "");
    const url = `/${chapterSlug}/${panelFile}`;
    if (typeof window !== "undefined" && window.location?.pathname !== url) {
      goto(url, {});
    }
  }
  if (typeof window !== "undefined") {
    showTopNav = false;
    showBottomNav = false;
  }
  if (showChapterModal) {
    saveFocus();
    chapterRelease = trapFocus();
  } else if (chapterRelease) {
    chapterRelease();
    chapterRelease = void 0;
    restoreFocus();
  }
  if (showInquiryModal) {
    saveFocus();
    inquiryRelease = trapFocus();
  } else if (inquiryRelease) {
    inquiryRelease();
    inquiryRelease = void 0;
    restoreFocus();
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    TopNav($$payload2, {
      isDesktop: isPointerDesktop,
      onChapterSelect: () => showChapterModal = true,
      chaptersCount: chapters.length,
      canGoForward: currentPanel < panels.length - 1 || currentChapter < chapters.length - 1,
      onInquiry: () => showInquiryModal = true,
      hasUnreadReplies,
      get show() {
        return showTopNav;
      },
      set show($$value) {
        showTopNav = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----> <main class="svelte-2mwxuj">`;
    if (panels.length > 0) {
      $$payload2.out += "<!--[-->";
      ComicPanel($$payload2, {
        panels,
        currentPanel,
        lastScroll,
        onNext: next,
        onSwipeUp: handleSwipeUp,
        onSwipeDown: handleSwipeDown
      });
    } else {
      $$payload2.out += "<!--[!-->";
      $$payload2.out += `<div class="loading"><p>Loading...</p></div>`;
    }
    $$payload2.out += `<!--]--></main> `;
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    BottomNav($$payload2, {
      isDesktop: isPointerDesktop,
      canGoBack: currentPanel > 0 || currentChapter > 0,
      canGoForward: currentPanel < panels.length - 1 || currentChapter < chapters.length - 1,
      onFirst: withNavTimer(first, "bottom"),
      onBack: withNavTimer(prev, "bottom"),
      onForward: withNavTimer(next, "bottom"),
      onChapterSelect: () => showChapterModal = true,
      chaptersCount: chapters.length,
      isSaved,
      onSave: saveLocation,
      get show() {
        return showBottomNav;
      },
      set show($$value) {
        showBottomNav = $$value;
        $$settled = false;
      }
    });
    $$payload2.out += `<!----> `;
    if (showChapterModal) {
      $$payload2.out += "<!--[-->";
      const each_array = ensure_array_like(chapters);
      $$payload2.out += `<div class="chapter-modal-backdrop svelte-2mwxuj" role="button" aria-label="Close chapter selector" tabindex="0"><div class="chapter-modal svelte-2mwxuj" role="dialog" aria-modal="true" tabindex="-1"><h2 class="svelte-2mwxuj">Select Chapter</h2> <div class="chapter-thumbnails svelte-2mwxuj"><!--[-->`;
      for (let idx = 0, $$length = each_array.length; idx < $$length; idx++) {
        let chapter = each_array[idx];
        $$payload2.out += `<figure class="chapter-thumb svelte-2mwxuj"><button type="button" class="chapter-thumb-btn"${attr("aria-label", `Select chapter ${chapter.title}`)}><img${attr("src", chapter.thumbnail)}${attr("alt", chapter.title)} class="svelte-2mwxuj"/></button> <figcaption class="svelte-2mwxuj">${escape_html(chapter.title)}</figcaption></figure>`;
      }
      $$payload2.out += `<!--]--></div></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    if (showInquiryModal) {
      $$payload2.out += "<!--[-->";
      $$payload2.out += `<div class="modal-backdrop svelte-2mwxuj" role="button" aria-label="Close inquiry dialog" tabindex="0"><div class="modal svelte-2mwxuj" role="dialog" aria-modal="true" tabindex="-1"><h3>Submit a Question or Statement</h3> <textarea rows="4" placeholder="Type your question or statement here..." class="svelte-2mwxuj">`;
      const $$body = escape_html(inquiryText);
      if ($$body) {
        $$payload2.out += `${$$body}`;
      }
      $$payload2.out += `</textarea> <div class="modal-actions svelte-2mwxuj"><button>Submit</button> <button>Cancel</button></div></div></div>`;
    } else {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]--> `;
    {
      $$payload2.out += "<!--[!-->";
    }
    $$payload2.out += `<!--]-->`;
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
