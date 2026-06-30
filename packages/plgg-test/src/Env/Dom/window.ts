import {
  DomDocument,
  DomElement,
  DomEventTarget,
  ListenerMap,
  DOCUMENT_NODE,
} from "./types.js";
import {
  addListener,
  dispatchAlong,
  removeListener,
} from "./event.js";
import {
  activeElement,
  bubblePath,
  makeElement,
  makeText,
} from "./node.js";

/**
 * The `window`/`document` pair and the History/Location surface plgg's
 * application runtime drives. Navigation is INERT by default — an anchor
 * click never auto-changes `location`; only `history.pushState`/
 * `replaceState` do (which the runtime calls explicitly). So a navigation
 * spec sees exactly the History-API state the runtime sets, with no
 * navigation-disable knob to configure.
 */

export type DomLocation = {
  pathname: string;
  search: string;
  href: string;
  origin: string;
};

export type DomHistory = Readonly<{
  pushState: (
    data: unknown,
    unused: string,
    url: string,
  ) => void;
  replaceState: (
    data: unknown,
    unused: string,
    url: string,
  ) => void;
}>;

export type DomComputedStyle = Readonly<{
  position: string;
}>;

export interface DomWindow extends DomEventTarget {
  readonly document: DomDocument;
  readonly history: DomHistory;
  readonly location: DomLocation;
  getComputedStyle: (
    el: DomElement,
  ) => DomComputedStyle;
}

// First element (self or descendant) whose `id` attribute matches.
const findById = (
  root: DomElement,
  id: string,
): DomElement | null => {
  if (root.getAttribute("id") === id) {
    return root;
  }
  return root
    .elementChildren()
    .reduce<DomElement | null>(
      (found, child) =>
        found ?? findById(child, id),
      null,
    );
};

/** Builds a wired `window`/`document` pair seeded at `http://localhost/`. */
export const makeDom = (): Readonly<{
  window: DomWindow;
  document: DomDocument;
}> => {
  const location: DomLocation = {
    pathname: "/",
    search: "",
    href: "http://localhost/",
    origin: "http://localhost",
  };
  // pushState/replaceState resolve `url` against the current href and write
  // the parts the runtime reads back. No popstate is fired (back/forward only).
  const applyUrl = (url: string): void => {
    const next = new URL(url, location.href);
    location.pathname = next.pathname;
    location.search = next.search;
    location.href = next.href;
    location.origin = next.origin;
  };
  const history: DomHistory = {
    pushState: (_data, _unused, url) =>
      applyUrl(url),
    replaceState: (_data, _unused, url) =>
      applyUrl(url),
  };

  const head = makeElement("head");
  const body = makeElement("body");
  const docListeners: ListenerMap = new Map();
  const winListeners: ListenerMap = new Map();
  // a holder breaks the document↔window cycle: document.defaultView reads it,
  // it is filled once the window exists below.
  const winHolder: { win: DomWindow | null } = {
    win: null,
  };

  const document: DomDocument = {
    nodeType: DOCUMENT_NODE,
    parentNode: null,
    listeners: docListeners,
    get defaultView(): DomEventTarget | null {
      return winHolder.win;
    },
    createElement: (tag) => makeElement(tag),
    createTextNode: (data) => makeText(data),
    body,
    head,
    get activeElement(): DomElement | null {
      return activeElement();
    },
    getElementById: (id) => findById(body, id),
    kids: () => [head, body],
    // body/head are never relocated, so detaching from the document is a no-op.
    removeChild: (child) => child,
    addEventListener: (type, listener) =>
      addListener(docListeners, type, listener),
    removeEventListener: (type, listener) =>
      removeListener(
        docListeners,
        type,
        listener,
      ),
    dispatchEvent: (event) =>
      dispatchAlong(
        event.bubbles
          ? bubblePath(document)
          : [document],
        event,
      ),
  };

  const window: DomWindow = {
    listeners: winListeners,
    parentNode: null,
    defaultView: null,
    document,
    history,
    location,
    getComputedStyle: (el) => ({
      position: el.style.position ?? "static",
    }),
    addEventListener: (type, listener) =>
      addListener(winListeners, type, listener),
    removeEventListener: (type, listener) =>
      removeListener(
        winListeners,
        type,
        listener,
      ),
    dispatchEvent: (event) =>
      dispatchAlong(
        event.bubbles
          ? bubblePath(window)
          : [window],
        event,
      ),
  };

  winHolder.win = window;
  body.parentNode = document;
  head.parentNode = document;
  return { window, document };
};
