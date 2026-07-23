import {
  ELEMENT_NODE,
  TEXT_NODE,
} from "./types.js";
import {
  DomRectCtor,
  MouseEventCtor,
} from "./event.js";
import { resetFocus } from "./node.js";
import { makeDom } from "./window.js";

/**
 * Installs the in-house DOM onto `globalThis` and returns an async teardown
 * that removes exactly what it added — so a DOM installed for one spec file
 * never leaks into the next (the per-file isolation the Runner relies on).
 * Only keys ABSENT from the Node global are installed; Node's own `Event`/
 * `EventTarget` family is reused as-is (dispatch sets `target` itself), so no
 * save/restore of intrinsics is needed.
 */

// A teardown handle (mirrors dom.ts's RestoreEnv without importing it, to
// keep this module free of a cycle back through the seam).
type Restore = () => Promise<void>;

// Reads a node's brand fields off an unknown value without a cast.
const nodeTypeOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null
    ? Reflect.get(value, "nodeType")
    : undefined;

const tagNameOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null
    ? Reflect.get(value, "tagName")
    : undefined;

/**
 * An `instanceof` brand for elements: any element, or only a given tagName.
 * `node instanceof HTMLInputElement` calls this via Symbol.hasInstance — no
 * `class` and no `this`, exactly what the renderer's narrowing needs.
 */
export const elementBrand = (
  tag?: string,
): Readonly<{
  [Symbol.hasInstance]: (v: unknown) => boolean;
}> => ({
  [Symbol.hasInstance]: (value) =>
    nodeTypeOf(value) === ELEMENT_NODE &&
    (tag === undefined ||
      tagNameOf(value) === tag),
});

/** The `instanceof CharacterData` brand for text nodes. */
export const textBrand: Readonly<{
  [Symbol.hasInstance]: (v: unknown) => boolean;
}> = {
  [Symbol.hasInstance]: (value) =>
    nodeTypeOf(value) === TEXT_NODE,
};

export const installDom =
  async (): Promise<Restore> => {
    const { window, document } = makeDom();
    const globals: Record<string, unknown> = {
      window,
      document,
      self: window,
      top: window,
      Element: elementBrand(),
      HTMLElement: elementBrand(),
      HTMLInputElement: elementBrand("INPUT"),
      HTMLTextAreaElement:
        elementBrand("TEXTAREA"),
      HTMLSelectElement: elementBrand("SELECT"),
      HTMLAnchorElement: elementBrand("A"),
      HTMLLIElement: elementBrand("LI"),
      CharacterData: textBrand,
      MouseEvent: MouseEventCtor,
      DOMRect: DomRectCtor,
    };
    const added: Array<string> = [];
    Object.keys(globals).forEach((key) => {
      if (!(key in globalThis)) {
        Object.defineProperty(globalThis, key, {
          configurable: true,
          writable: true,
          value: globals[key],
        });
        added.push(key);
      }
    });
    return async () => {
      added.forEach((key) => {
        Reflect.deleteProperty(globalThis, key);
      });
      resetFocus();
    };
  };
