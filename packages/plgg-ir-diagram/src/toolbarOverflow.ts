export const inlineToolCount = (
  widths: readonly number[],
  available: number,
  trigger: number,
) => {
  let used = 0;
  let prefix = 0;
  for (const width of widths) {
    used += width;
    if (used + trigger <= available) prefix++;
  }
  return used <= available
    ? widths.length
    : prefix;
};

// Slots keep each tool in the renderer's tree,
// including its handlers and nested popovers.
export const observeToolbar = (root: Element) => {
  const bar = root.querySelector(".toolbar");
  if (!bar?.attachShadow) return () => {};
  const shadow = bar.attachShadow({
    mode: "open",
  });
  const row = document.createElement("slot");
  const more = document.createElement("button");
  more.type = "button";
  more.textContent = "…";
  more.setAttribute(
    "aria-label",
    "その他のツール",
  );
  const menu = document.createElement("div");
  menu.popover = "auto";
  more.popoverTargetElement = menu;
  const overflow = document.createElement("slot");
  overflow.name = "overflow";
  menu.append(overflow);
  const style = document.createElement("style");
  style.textContent = `
    button { flex:none; min-height:34px; min-width:34px;
      font:inherit; color:inherit; background:var(--paper);
      border:1px solid var(--ink); cursor:pointer }
    div:popover-open { display:grid; justify-items:start;
      gap:4px; width:max-content; max-width:95vw; max-height:65vh;
      overflow:auto; margin:0; box-sizing:border-box;
      color:var(--ink); background:var(--paper);
      border:1px solid var(--ink); padding:6px }
  `;
  shadow.append(style, row, more, menu);
  const position = () => {
    const rect = more.getBoundingClientRect();
    menu.style.inset =
      rect.bottom +
      "px auto auto " +
      rect.left +
      "px";
    menu.style.translate = `clamp(${-rect.left}px, calc(${rect.width}px - 100%), 0px) 0`;
  };
  menu.addEventListener("beforetoggle", position);
  const fit = () => {
    const items = Array.from(bar.children);
    for (const item of items)
      item.removeAttribute("slot");
    more.hidden = false;
    const widths = items.map(
      (item) =>
        item.getBoundingClientRect().width,
    );
    const count = inlineToolCount(
      widths,
      bar.clientWidth,
      more.getBoundingClientRect().width,
    );
    more.hidden = count === items.length;
    for (const item of items.slice(count))
      item.setAttribute("slot", overflow.name);
    if (menu.matches(":popover-open")) {
      if (more.hidden) menu.hidePopover();
      else position();
    }
  };
  const sizes = new ResizeObserver(fit);
  const observe = () => {
    sizes.disconnect();
    sizes.observe(bar);
    for (const item of bar.children)
      sizes.observe(item);
    fit();
  };
  const children = new MutationObserver(observe);
  children.observe(bar, { childList: true });
  observe();
  return () => {
    children.disconnect();
    sizes.disconnect();
  };
};
