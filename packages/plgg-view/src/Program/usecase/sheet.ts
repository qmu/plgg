import { SoftStr } from "plgg";
import { CssRule } from "plgg-view/Html/model/Attribute";
import { renderCssRule } from "plgg-view/Html/usecase/collectCss";

/**
 * A `<style data-plgg-style>` in `document.head` owning a mounted runtime's
 * atomic CSS. `add(rules)` merges the tree's collected rules in — **insert
 * only, never remove**: an atom's className is a content hash (same class,
 * same declaration, forever), and an exiting node held in the DOM past its
 * tree (the deferred-removal lifecycle) still wears classes the *new* tree no
 * longer collects — dropping its rules would snap its padding/border/background
 * off mid-animation. `dispose()` removes the element on cleanup. The confined
 * DOM seam for client-side style injection — kept out of the pure core and
 * `collectCss`.
 */
export const makeSheet = (): Readonly<{
  add: (
    rules: ReadonlyArray<CssRule>,
  ) => void;
  dispose: () => void;
}> => {
  const element = document.createElement("style");
  element.setAttribute("data-plgg-style", "");
  document.head.appendChild(element);
  // mutable seam: every rule ever added, by content-hashed className
  const known = new Map<SoftStr, CssRule>();
  return {
    add: (
      rules: ReadonlyArray<CssRule>,
    ): void => {
      const fresh = rules.filter(
        (rule) => !known.has(rule.className),
      );
      if (fresh.length > 0) {
        fresh.forEach((rule) =>
          known.set(rule.className, rule),
        );
        element.textContent = Array.from(
          known.values(),
        )
          .map(renderCssRule)
          .join("");
      }
    },
    dispose: (): void => element.remove(),
  };
};
