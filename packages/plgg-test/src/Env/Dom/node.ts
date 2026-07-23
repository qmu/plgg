import {
  DomChild,
  DomCollection,
  DomElement,
  DomEventTarget,
  DomParent,
  DomStyle,
  DomText,
  ListenerMap,
  ELEMENT_NODE,
  TEXT_NODE,
} from "./types.js";
import {
  DomRectCtor,
  addListener,
  dispatchAlong,
  removeListener,
} from "./event.js";
import { queryAll, queryOne } from "./select.js";

/**
 * The element/text node graph. Nodes are plain mutable objects built by
 * factories that close over their own `self` (no `class`, no `this`); the
 * `instanceof` globals (install.ts) brand them by `nodeType`/`tagName`.
 * Layout is intentionally absent — `getBoundingClientRect`/offsets are zero
 * and spec-overridable.
 */

// The document-wide focus target. A module seam (mirrors the real
// `document.activeElement`), reset between files by install.ts.
const focusState: { active: DomElement | null } =
  {
    active: null,
  };

/** The current `document.activeElement` (or null). */
export const activeElement =
  (): DomElement | null => focusState.active;

/** Clears the focus target — called on environment teardown. */
export const resetFocus = (): void => {
  focusState.active = null;
};

// Wraps a node array as a live, array-like collection (childNodes/children).
const collectionOf = <T>(
  items: ReadonlyArray<T>,
): DomCollection<T> => {
  const base: DomCollection<T> = {
    length: items.length,
    item: (index) => items[index] ?? null,
    [Symbol.iterator]: () =>
      items[Symbol.iterator](),
  };
  items.forEach((item, index) => {
    base[index] = item;
  });
  return base;
};

const elementChildrenOf = (
  kids: ReadonlyArray<DomChild>,
): ReadonlyArray<DomElement> =>
  kids.filter(
    (k): k is DomElement =>
      k.nodeType === ELEMENT_NODE,
  );

// Detaches a node from its current parent, if any.
const detach = (child: DomChild): void => {
  const parent = child.parentNode;
  if (parent !== null) {
    parent.removeChild(child);
  }
};

// The node that follows `child` among its parent's children, or null.
const siblingAfter = (
  child: DomChild,
): DomChild | null => {
  const parent = child.parentNode;
  if (parent === null) {
    return null;
  }
  const arr = parent.kids();
  const index = arr.indexOf(child);
  return index < 0
    ? null
    : (arr[index + 1] ?? null);
};

// `el.contains(other)`: identity or a descendant (element or text).
const containsIn = (
  el: DomElement,
  other: DomChild | null,
): boolean =>
  other === null
    ? false
    : other === el
      ? true
      : el
          .kids()
          .some(
            (k) =>
              k === other ||
              (k.nodeType === ELEMENT_NODE &&
                containsIn(k, other)),
          );

// The concatenated text of a node's subtree (`textContent` getter).
const textOf = (node: DomChild): string =>
  node.nodeType === TEXT_NODE
    ? node.data
    : node
        .kids()
        .reduce((acc, k) => acc + textOf(k), "");

/**
 * The bubbling path for an event from `start`: the node and its ancestors,
 * then — once the climb reaches the document — the window (its `defaultView`).
 * A detached subtree stops at its local root, never reaching document/window.
 */
export const bubblePath = (
  start: DomEventTarget,
): ReadonlyArray<DomEventTarget> => {
  const path: Array<DomEventTarget> = [];
  let cursor: DomEventTarget | null = start;
  while (cursor !== null) {
    path.push(cursor);
    cursor = cursor.parentNode;
  }
  const top = path[path.length - 1];
  if (
    top !== undefined &&
    top.defaultView !== null
  ) {
    path.push(top.defaultView);
  }
  return path;
};

/** Builds a text (CharacterData) node with a writable `.data`. */
export const makeText = (
  data: string,
): DomText => {
  const state: {
    data: string;
    parent: DomParent | null;
  } = { data, parent: null };
  const self: DomText = {
    nodeType: TEXT_NODE,
    get parentNode(): DomParent | null {
      return state.parent;
    },
    set parentNode(parent: DomParent | null) {
      state.parent = parent;
    },
    get data(): string {
      return state.data;
    },
    set data(value: string) {
      state.data = value;
    },
    get textContent(): string {
      return state.data;
    },
    set textContent(value: string) {
      state.data = value;
    },
    get nextSibling(): DomChild | null {
      return siblingAfter(self);
    },
    remove: (): void => detach(self),
    contains: (other): boolean => other === self,
  };
  return self;
};

// Replaces an element's children with a single text node (or none for "").
const setText = (
  el: DomElement,
  value: string,
): void =>
  el.replaceChildren(
    ...(value === "" ? [] : [makeText(value)]),
  );

/** Builds an element node for `tag` (tagName uppercased). */
export const makeElement = (
  tag: string,
): DomElement => {
  const state: {
    attrs: Map<string, string>;
    kids: Array<DomChild>;
    style: DomStyle;
    listeners: ListenerMap;
    parent: DomParent | null;
  } = {
    attrs: new Map(),
    kids: [],
    style: {},
    listeners: new Map(),
    parent: null,
  };
  const self: DomElement = {
    nodeType: ELEMENT_NODE,
    tagName: tag.toUpperCase(),
    style: state.style,
    listeners: state.listeners,
    defaultView: null,
    value: "",
    checked: false,
    get parentNode(): DomParent | null {
      return state.parent;
    },
    set parentNode(parent: DomParent | null) {
      state.parent = parent;
    },
    get rel(): string {
      return state.attrs.get("rel") ?? "";
    },
    get target(): string {
      return state.attrs.get("target") ?? "";
    },

    getAttribute: (name): string | null =>
      state.attrs.get(name) ?? null,
    setAttribute: (name, value): void => {
      state.attrs.set(name, value);
    },
    hasAttribute: (name): boolean =>
      state.attrs.has(name),
    removeAttribute: (name): void => {
      state.attrs.delete(name);
    },

    appendChild: (child): DomChild => {
      detach(child);
      state.kids.push(child);
      child.parentNode = self;
      return child;
    },
    insertBefore: (node, ref): DomChild => {
      detach(node);
      if (ref === null) {
        state.kids.push(node);
      } else {
        const i = state.kids.indexOf(ref);
        state.kids.splice(
          i < 0 ? state.kids.length : i,
          0,
          node,
        );
      }
      node.parentNode = self;
      return node;
    },
    removeChild: (child): DomChild => {
      const i = state.kids.indexOf(child);
      if (i >= 0) {
        state.kids.splice(i, 1);
      }
      child.parentNode = null;
      return child;
    },
    replaceChild: (next, prev): DomChild => {
      detach(next);
      const i = state.kids.indexOf(prev);
      if (i >= 0) {
        state.kids.splice(i, 1, next);
        prev.parentNode = null;
        next.parentNode = self;
      }
      return prev;
    },
    replaceChildren: (...nodes): void => {
      state.kids.forEach((k) => {
        k.parentNode = null;
      });
      state.kids.length = 0;
      nodes.forEach((n) => {
        detach(n);
        state.kids.push(n);
        n.parentNode = self;
      });
    },
    remove: (): void => detach(self),
    contains: (other): boolean =>
      containsIn(self, other),

    get childNodes(): DomCollection<DomChild> {
      return collectionOf(state.kids);
    },
    get children(): DomCollection<DomElement> {
      return collectionOf(
        elementChildrenOf(state.kids),
      );
    },
    get firstChild(): DomChild | null {
      return state.kids[0] ?? null;
    },
    get firstElementChild(): DomElement | null {
      return (
        elementChildrenOf(state.kids)[0] ?? null
      );
    },
    get nextSibling(): DomChild | null {
      return siblingAfter(self);
    },
    get parentElement(): DomElement | null {
      const parent = state.parent;
      return parent !== null &&
        parent.nodeType === ELEMENT_NODE
        ? parent
        : null;
    },

    get textContent(): string {
      return textOf(self);
    },
    set textContent(value: string) {
      setText(self, value);
    },
    get innerHTML(): string {
      return textOf(self);
    },
    set innerHTML(value: string) {
      setText(self, value);
    },

    addEventListener: (type, listener): void =>
      addListener(
        state.listeners,
        type,
        listener,
      ),
    removeEventListener: (type, listener): void =>
      removeListener(
        state.listeners,
        type,
        listener,
      ),
    dispatchEvent: (event): boolean =>
      dispatchAlong(
        event.bubbles ? bubblePath(self) : [self],
        event,
      ),

    focus: (): void => {
      focusState.active = self;
    },
    getBoundingClientRect: () =>
      DomRectCtor(0, 0, 0, 0),

    querySelector: (
      selector,
    ): DomElement | null =>
      queryOne(self, selector, (node) =>
        node.elementChildren(),
      ),
    querySelectorAll: (
      selector,
    ): ReadonlyArray<DomElement> =>
      queryAll(self, selector, (node) =>
        node.elementChildren(),
      ),

    kids: (): ReadonlyArray<DomChild> =>
      state.kids,
    elementChildren:
      (): ReadonlyArray<DomElement> =>
        elementChildrenOf(state.kids),
  };
  return self;
};
