import {
  Option,
  SoftStr,
  some,
  none,
  pipe,
  tryCatch,
  toOption,
  chainOption,
  matchOption,
  fromNullable,
} from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import {
  Url,
  makeUrl,
} from "plgg-view/Program/model/Url";
import { makeRenderer } from "plgg-view/Program/usecase/render";

/**
 * A routing-aware Elm-Architecture program (Browser.application-style), kept
 * pure-sandbox-compatible (no `Cmd`). `init` seeds the model from the entry URL;
 * `onUrlChange` turns a navigation (an intercepted in-app `<a>` click, or
 * back/forward) into a `Msg` the pure `update` folds in. Navigation is
 * link-driven — programmatic push is a non-goal of this minimum.
 */
export type Application<Model, Msg> = Readonly<{
  init: (url: Url) => Model;
  update: (msg: Msg, model: Model) => Model;
  view: (model: Model) => Html<Msg>;
  onUrlChange: (url: Url) => Msg;
  /**
   * The model→URL projection (inverse of {@link onUrlChange}): after each
   * dispatch the runtime reconciles the address bar against `toUrl(model)`, so a
   * slice of the model is *reflected* into the query (nuqs-style) without any
   * imperative URL setter and without a `Cmd`. Omit for a URL that only the user
   * (links/back/forward) drives.
   */
  toUrl?: (model: Model) => Url;
  /**
   * How a model→URL reflection affects history. Defaults to `"replace"` (the
   * nuqs default — typing/filtering does not spam history); return `"push"` to
   * mark a real navigation (so back/forward traverses it) or `"none"` to skip the
   * write for a given transition.
   */
  historyMode?: (
    prev: Model,
    next: Model,
  ) => "push" | "replace" | "none";
}>;

/** Reads the browser's current location into a {@link Url}. */
const currentUrl = (): Url =>
  makeUrl(
    window.location.pathname,
    window.location.search,
  );

/**
 * Applies one history write for a model→URL reflection: `"replace"` rewrites the
 * current entry (the default — no history spam), `"push"` adds one (so
 * back/forward traverses it), `"none"` skips. The confined imperative seam for
 * the reflection direction.
 */
const applyHistory = (
  mode: "push" | "replace" | "none",
  target: SoftStr,
): void => {
  if (mode === "push") {
    window.history.pushState(null, "", target);
  } else if (mode === "replace") {
    window.history.replaceState(null, "", target);
  }
};

/**
 * `rel` tokens whose presence means "let the browser handle this link".
 */
const PASSTHROUGH_REL = [
  "external",
  "noopener",
  "noreferrer",
];

/**
 * Whether a click is a plain in-app navigation candidate (left button, no
 * modifier keys, not already handled). Cloned from plgg-router's link guard —
 * peer experimental packages define this in parallel rather than import.
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

/** Walks up to the nearest enclosing `<a>` (instanceof, no cast). */
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

const relPassesThrough = (
  anchor: HTMLAnchorElement,
): boolean =>
  anchor.rel
    .split(/\s+/)
    .some((token) =>
      PASSTHROUGH_REL.includes(token),
    );

const toUrl = (href: SoftStr): Option<URL> =>
  pipe(
    tryCatch(
      (h: SoftStr) =>
        new URL(h, window.location.href),
    )(href),
    toOption,
  );

const isHttp = (url: URL): boolean =>
  url.protocol === "http:" ||
  url.protocol === "https:";

/**
 * The in-app {@link Url} a click should navigate to, or `none()` when the
 * browser default must be preserved (modifier-clicks, `target`/`download`/
 * pass-through `rel`, hrefless, malformed/non-`http(s)`, cross-origin).
 */
const navTarget = (
  event: MouseEvent,
): Option<Url> =>
  isPlainLeftClick(event)
    ? pipe(
        findAnchor(event.target),
        chainOption(
          (anchor: HTMLAnchorElement) =>
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
                makeUrl(url.pathname, url.search),
              )
            : none(),
        ),
      )
    : none();

/**
 * Runs an {@link Application} against a DOM container: renders `view(init(url))`,
 * re-renders on every dispatched `Msg`, intercepts in-app `<a>` clicks (push +
 * `onUrlChange`), and handles back/forward via `popstate`. Returns a cleanup
 * that removes the listeners and empties the container.
 *
 * The live `model` is the runtime's single mutable seam (as in {@link sandbox});
 * the History/DOM listeners are the irreducible imperative seam.
 */
export const application =
  <Model, Msg>(
    program: Application<Model, Msg>,
  ) =>
  (container: Element): (() => void) => {
    let model: Model = program.init(currentUrl());
    const dispatch = (msg: Msg): void => {
      const prev = model;
      model = program.update(msg, model);
      render(program.view(model));
      reflectUrl(prev, model);
    };
    const render = makeRenderer(
      container,
      dispatch,
    );
    // model→URL reflection: a render-time effect (NOT a Cmd) confined to this
    // seam. Gated on a string diff so it never loops — a URL the user drove in
    // via onUrlChange already equals toUrl(model), so no spurious write.
    const reflectUrl = (
      prev: Model,
      next: Model,
    ): void =>
      pipe(
        fromNullable(program.toUrl),
        matchOption(
          () => undefined,
          (toUrl: (model: Model) => Url) => {
            const target = toUrl(next);
            const targetStr =
              target.path + target.search;
            if (
              targetStr !==
              window.location.pathname +
                window.location.search
            ) {
              applyHistory(
                program.historyMode
                  ? program.historyMode(
                      prev,
                      next,
                    )
                  : "replace",
                targetStr,
              );
            }
          },
        ),
      );
    const go = (url: Url): void =>
      dispatch(program.onUrlChange(url));

    const onClick = (event: MouseEvent): void =>
      pipe(
        navTarget(event),
        matchOption(
          () => undefined,
          (url) => {
            event.preventDefault();
            window.history.pushState(
              null,
              "",
              url.path + url.search,
            );
            go(url);
          },
        ),
      );
    const onPopState = (): void =>
      go(currentUrl());

    render(program.view(model));
    window.addEventListener(
      "popstate",
      onPopState,
    );
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener(
        "popstate",
        onPopState,
      );
      document.removeEventListener(
        "click",
        onClick,
      );
      container.replaceChildren();
    };
  };
