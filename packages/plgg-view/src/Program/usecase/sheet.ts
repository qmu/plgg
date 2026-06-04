import { SoftStr } from "plgg";

/**
 * A `<style data-plgg-style>` in `document.head` owning a mounted runtime's
 * atomic CSS. `set(css)` replaces its content with the tree's collected
 * stylesheet (`collectCss` is already deduped, so a whole-sheet replace is
 * correct and cheap); `dispose()` removes it on cleanup. The confined DOM seam
 * for client-side style injection — kept out of the pure core and `collectCss`.
 */
export const makeSheet = (): Readonly<{
  set: (css: SoftStr) => void;
  dispose: () => void;
}> => {
  const element = document.createElement("style");
  element.setAttribute("data-plgg-style", "");
  document.head.appendChild(element);
  return {
    set: (css: SoftStr): void => {
      if (element.textContent !== css) {
        element.textContent = css;
      }
    },
    dispose: (): void => element.remove(),
  };
};
