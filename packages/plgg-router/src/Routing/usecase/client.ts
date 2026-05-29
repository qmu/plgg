import {
  Option,
  SoftStr,
  some,
  none,
  pipe,
  tryCatch,
  toOption,
  getOr,
  mapOption,
  chainOption,
  matchOption,
  fromNullable,
  box,
} from "plgg";
import { VNode } from "plgg-view";
import { Location } from "plgg-router/Routing/model/Location";
import { Router } from "plgg-router/Routing/model/Router";
import { makeLocation } from "plgg-router/Routing/model/Location";
import { parseQuery } from "plgg-router/Routing/usecase/parseQuery";
import { resolve } from "plgg-router/Routing/usecase/resolve";

// Re-exported on the `plgg-router/client` barrel so a host can build a
// `Location` without reaching into the core entry.
export { makeLocation };

/**
 * The synthetic event `push`/`replace` dispatch so a started router re-renders
 * on programmatic navigation exactly as it does on `popstate`.
 */
const NAV_EVENT = "plgg-router:navigate";

/**
 * `rel` tokens whose presence means "let the browser handle this link" — the
 * link-interceptor never hijacks them. Covers the security/accessibility
 * defaults a SPA must not break.
 */
const PASSTHROUGH_REL = [
  "external",
  "noopener",
  "noreferrer",
];

/**
 * Options for {@link start}.
 *
 * `render` is **required and host-provided**: plgg-router never imports a DOM
 * renderer (that lives in `plgg-server/client`), keeping it free of any
 * sibling-package dependency. A host wires `import { render } from
 * "plgg-server/client"; start(router, root, { render })`. `notFound` is the
 * view rendered when no route matches; it defaults to a plain "Not Found" text
 * node.
 */
export type StartOptions = Readonly<{
  render: (vnode: VNode, container: Element) => void;
  notFound?: VNode;
}>;

/**
 * Reads the browser's current location into a {@link Location}: the pathname and
 * the parsed query, with empty `params` (a later `resolve` fills them from the
 * matched route).
 */
export const currentLocation = (): Location =>
  makeLocation(
    window.location.pathname,
    {},
    parseQuery(window.location.search),
  );

/**
 * Resolves an href (possibly relative) against the current document, as an
 * `Option<URL>` — `none()` when the URL is malformed (so callers no-op rather
 * than throw).
 */
const toUrl = (href: SoftStr): Option<URL> =>
  pipe(
    tryCatch(
      (h: SoftStr) =>
        new URL(h, window.location.href),
    )(href),
    toOption,
  );

/**
 * Whether a URL uses an in-app navigable scheme (`http`/`https`). Other schemes
 * (`mailto:`, `tel:`, `javascript:`, `data:`, ...) are left to the browser.
 */
const isHttp = (url: URL): boolean =>
  url.protocol === "http:" ||
  url.protocol === "https:";

/**
 * Whether a path is safe to push to the History API: it must resolve to an
 * `http(s)` URL. Misconfigured callers silently no-op rather than crash the app.
 */
const navigable = (path: SoftStr): boolean =>
  pipe(toUrl(path), mapOption(isHttp), getOr(false));

/**
 * Walks up from an event target to the nearest enclosing `<a>`, as an `Option`.
 * Narrowing is done with `instanceof` (no casts).
 */
const findAnchor = (
  target: EventTarget | null,
): Option<HTMLAnchorElement> => {
  let el: Element | null =
    target instanceof Element ? target : null;
  while (el !== null) {
    if (el instanceof HTMLAnchorElement) {
      return some(el);
    }
    el = el.parentElement;
  }
  return none();
};

/**
 * Whether an anchor opts out of interception via its `rel`.
 */
const relPassesThrough = (
  anchor: HTMLAnchorElement,
): boolean =>
  anchor.rel
    .split(/\s+/)
    .some((token) =>
      PASSTHROUGH_REL.includes(token),
    );

/**
 * Whether a click is a plain in-app navigation candidate: left button, no
 * modifier keys, not already handled. A modifier/middle/handled click is left
 * to the browser.
 */
const isPlainLeftClick = (
  event: MouseEvent,
): boolean =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

/**
 * Decides the in-app path a click should navigate to, or `none()` when the
 * browser default must be preserved. Preserves defaults for: modifier-clicks,
 * non-left-button clicks, already-handled events, anchors with `target` /
 * `download` / pass-through `rel`, hrefless anchors, malformed or non-`http(s)`
 * URLs, and cross-origin links.
 */
const navTarget = (
  event: MouseEvent,
): Option<SoftStr> =>
  isPlainLeftClick(event)
    ? pipe(
        findAnchor(event.target),
        chainOption((anchor: HTMLAnchorElement) =>
          anchor.target !== "" ||
          anchor.hasAttribute("download") ||
          relPassesThrough(anchor)
            ? none()
            : fromNullable(
                anchor.getAttribute("href"),
              ),
        ),
        chainOption(toUrl),
        chainOption((url: URL) =>
          isHttp(url) &&
          url.origin === window.location.origin
            ? some(
                url.pathname + url.search + url.hash,
              )
            : none(),
        ),
      )
    : none();

/**
 * Programmatic navigation: pushes a new history entry and re-renders. No-ops if
 * `path` does not resolve to an `http(s)` URL. Scrolls to the top, matching the
 * browser default for a clicked link.
 */
export const push = (path: SoftStr): void => {
  if (!navigable(path)) {
    return;
  }
  window.history.pushState(null, "", path);
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event(NAV_EVENT));
};

/**
 * Programmatic navigation that replaces the current history entry instead of
 * pushing a new one (no back-stack entry). Same no-op guard as {@link push};
 * leaves scroll position untouched.
 */
export const replace = (path: SoftStr): void => {
  if (!navigable(path)) {
    return;
  }
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new Event(NAV_EVENT));
};

/**
 * Starts the router against the DOM: renders the current route immediately,
 * then re-renders on `popstate` (back/forward), on programmatic `push`/`replace`
 * (via the synthetic nav event), and on intercepted in-app `<a>` clicks.
 *
 * Returns a cleanup function that removes every listener it added.
 */
export const start = (
  router: Router,
  container: Element,
  options: StartOptions,
): (() => void) => {
  const fallback: VNode =
    options.notFound ??
    box("Text")({ value: "Not Found" });

  const renderCurrent = (): void =>
    options.render(
      pipe(
        resolve(router, currentLocation()),
        getOr(fallback),
      ),
      container,
    );

  const onClick = (event: MouseEvent): void =>
    pipe(
      navTarget(event),
      matchOption(
        () => undefined,
        (path) => {
          event.preventDefault();
          push(path);
        },
      ),
    );

  renderCurrent();
  window.addEventListener("popstate", renderCurrent);
  window.addEventListener(NAV_EVENT, renderCurrent);
  document.addEventListener("click", onClick);

  return () => {
    window.removeEventListener(
      "popstate",
      renderCurrent,
    );
    window.removeEventListener(
      NAV_EVENT,
      renderCurrent,
    );
    document.removeEventListener("click", onClick);
  };
};
