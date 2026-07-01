/**
 * Shared shapes for plgg-test's in-house test DOM. These are NARROW,
 * hand-rolled interfaces — exactly the surface plgg's client runtime and
 * its specs exercise — NOT a re-implementation of lib.dom. They are never
 * claimed to BE `Document`/`HTMLElement`: the runtime objects are installed
 * onto `globalThis` by string key (see install.ts), so a consumer compiled
 * against lib.dom binds to them purely at runtime. That is what keeps the
 * whole DOM free of `as`/`any` while plgg-test itself has no DOM lib.
 */

/** A DOM event listener. Events are Node's built-in `Event` (target set by us). */
export type DomListener = (event: Event) => void;

/** Per-target listener registry: event type → ordered listeners. */
export type ListenerMap = Map<
  string,
  Array<DomListener>
>;

/**
 * The minimal EventTarget surface every dispatch hop carries (elements, the
 * document, the window). `parentNode` drives bubbling; `defaultView` marks the
 * document so the path can append the window after it.
 */
export type DomEventTarget = Readonly<{
  listeners: ListenerMap;
  parentNode: DomEventTarget | null;
  defaultView: DomEventTarget | null;
  addEventListener: (
    type: string,
    listener: DomListener,
  ) => void;
  removeEventListener: (
    type: string,
    listener: DomListener,
  ) => void;
  dispatchEvent: (event: Event) => boolean;
}>;

/** A `DOMRect`-shaped value (no layout engine — zeros unless spec-overridden). */
export type DomRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

/** Inline style — an open string bag (`node.style.position = "absolute"`, …). */
export type DomStyle = Record<string, string>;

/** A node kind tag, used by the `instanceof` globals (Symbol.hasInstance). */
export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const DOCUMENT_NODE = 9;

/** A live, array-like node/element collection (`childNodes`, `children`). */
export interface DomCollection<T> {
  readonly length: number;
  item: (index: number) => T | null;
  [index: number]: T | undefined;
  [Symbol.iterator]: () => Iterator<T>;
}

/** Either node kind a parent can hold. */
export type DomChild = DomElement | DomText;

/** What can parent a node: an element or the document. */
export type DomParent = DomElement | DomDocument;

/** A character-data (text) node — `instanceof CharacterData`, writable `.data`. */
export interface DomText {
  readonly nodeType: typeof TEXT_NODE;
  parentNode: DomParent | null;
  data: string;
  textContent: string;
  readonly nextSibling: DomChild | null;
  remove: () => void;
  contains: (other: DomChild | null) => boolean;
}

/** An element node — the bulk of the test DOM surface. */
export interface DomElement {
  readonly nodeType: typeof ELEMENT_NODE;
  readonly tagName: string;
  parentNode: DomParent | null;
  readonly listeners: ListenerMap;
  readonly defaultView: DomEventTarget | null;
  readonly style: DomStyle;
  value: string;
  checked: boolean;
  readonly rel: string;
  readonly target: string;

  getAttribute: (name: string) => string | null;
  setAttribute: (
    name: string,
    value: string,
  ) => void;
  hasAttribute: (name: string) => boolean;
  removeAttribute: (name: string) => void;

  appendChild: (child: DomChild) => DomChild;
  insertBefore: (
    node: DomChild,
    ref: DomChild | null,
  ) => DomChild;
  removeChild: (child: DomChild) => DomChild;
  replaceChild: (
    next: DomChild,
    prev: DomChild,
  ) => DomChild;
  replaceChildren: (
    ...nodes: ReadonlyArray<DomChild>
  ) => void;
  remove: () => void;
  contains: (other: DomChild | null) => boolean;

  readonly childNodes: DomCollection<DomChild>;
  readonly children: DomCollection<DomElement>;
  readonly firstChild: DomChild | null;
  readonly firstElementChild: DomElement | null;
  readonly nextSibling: DomChild | null;
  readonly parentElement: DomElement | null;

  textContent: string;
  innerHTML: string;

  addEventListener: (
    type: string,
    listener: DomListener,
  ) => void;
  removeEventListener: (
    type: string,
    listener: DomListener,
  ) => void;
  dispatchEvent: (event: Event) => boolean;

  focus: () => void;
  getBoundingClientRect: () => DomRect;

  querySelector: (
    selector: string,
  ) => DomElement | null;
  querySelectorAll: (
    selector: string,
  ) => ReadonlyArray<DomElement>;

  kids: () => ReadonlyArray<DomChild>;
  elementChildren: () => ReadonlyArray<DomElement>;
}

/** The minimal document surface plgg's runtime and specs touch. */
export interface DomDocument {
  readonly nodeType: typeof DOCUMENT_NODE;
  parentNode: DomEventTarget | null;
  readonly listeners: ListenerMap;
  readonly defaultView: DomEventTarget | null;
  createElement: (tag: string) => DomElement;
  createTextNode: (data: string) => DomText;
  readonly body: DomElement;
  readonly head: DomElement;
  readonly activeElement: DomElement | null;
  getElementById: (
    id: string,
  ) => DomElement | null;
  kids: () => ReadonlyArray<DomChild>;
  removeChild: (child: DomChild) => DomChild;
  addEventListener: (
    type: string,
    listener: DomListener,
  ) => void;
  removeEventListener: (
    type: string,
    listener: DomListener,
  ) => void;
  dispatchEvent: (event: Event) => boolean;
}
