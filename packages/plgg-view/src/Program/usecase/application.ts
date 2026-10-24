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
import { collectCssRules } from "plgg-view/Html/usecase/collectCss";
import {
  Url,
  makeUrl,
} from "plgg-view/Program/model/Url";
import { makeRenderer } from "plgg-view/Program/usecase/render";
import { makeSheet } from "plgg-view/Program/usecase/sheet";
import { type Cmd } from "plgg-view/Program/model/Cmd";
import { type Sub } from "plgg-view/Program/model/Sub";
import {
  type SubEnv,
  type FrameEnv,
  runCmd,
  makeSubRuntime,
  browserSubEnv,
  browserFrameEnv,
} from "plgg-view/Program/usecase/effects";

/**
 * A routing-aware Elm-Architecture program (Browser.application-style) WITH
 * effects (D2). `init` seeds `[Model, Cmd]` from the entry URL; `update` folds a
 * `Msg` into `[nextModel, Cmd]`; `onUrlChange` turns a navigation (an
 * intercepted in-app `<a>` click, or back/forward) into a `Msg`; an optional
 * `subscriptions` declares ongoing sources. `Cmd`/`Sub` are pure data the
 * runtime alone executes, so `update` stays pure.
 *
 * DOCTRINE AMENDMENT (D2, roadmap
 * `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`): this runtime was
 * once "pure-sandbox-compatible (no `Cmd`)". D2 takes the break openly — one
 * signature, effects included; a pure branch returns `[model, cmdNone()]`. URL
 * reflection stays OUTSIDE `Cmd` on purpose (see {@link reflectUrl}).
 */
export type Application<Model, Msg> = Readonly<{
  init: (
    url: Url,
  ) => readonly [Model, Cmd<Msg>];
  update: (
    msg: Msg,
    model: Model,
  ) => readonly [Model, Cmd<Msg>];
  view: (model: Model) => Html<Msg>;
  onUrlChange: (url: Url) => Msg;
  /**
   * Ongoing sources active for the current model, re-diffed by key each
   * dispatch. Omit for a program with no subscriptions.
   */
  subscriptions?: (model: Model) => Sub<Msg>;
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
  /**
   * How a dispatch schedules its paint. `"frame"` (the default) batches every
   * dispatch landing within the same browser frame into ONE `view()` call and
   * ONE patch — several `Cmd`-driven fetches resolving out of order (not
   * `Promise.all`'d) each still fold into `update` immediately, but their
   * repaint collapses to a single `requestAnimationFrame` callback reading
   * the latest `model` (see {@link FrameEnv}). `"sync"` paints immediately
   * after every dispatch (today's pre-batching behaviour, no frame
   * scheduling) — the deterministic choice for a spec that asserts DOM state
   * right after a synchronous dispatch with no frame to flush.
   */
  render?: "frame" | "sync";
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
    env: SubEnv = browserSubEnv,
    frameEnv: FrameEnv = browserFrameEnv,
  ) =>
  (container: Element): (() => void) => {
    const [initModel, initCmd] = program.init(
      currentUrl(),
    );
    // mutable seams: the live model, an `alive` flag so an effect or
    // subscription resolving after teardown is dropped, and the cancel for a
    // paint `frame`-scheduled but not yet flushed (null when none is pending).
    let model: Model = initModel;
    let alive = true;
    let cancelPaint: (() => void) | null = null;
    const sync = program.render === "sync";
    const sheet = makeSheet();
    // Flushes the LATEST `model` through one `view()` + patch — read at flush
    // time (not schedule time), so N dispatches batched into one frame still
    // repaint only once, on the model the last of them produced.
    const flushPaint = (): void => {
      cancelPaint = null;
      if (alive) {
        paint(program.view(model));
      }
    };
    // `"sync"` paints every dispatch immediately (no batching); the `"frame"`
    // default (and the absence of the field) schedules at most one pending
    // flush per frame — a second dispatch landing before it fires just
    // updates `model` for the SAME pending flush to pick up.
    const schedulePaint = (): void => {
      if (sync) {
        paint(program.view(model));
      } else if (cancelPaint === null) {
        cancelPaint = frameEnv.schedule(flushPaint);
      }
    };
    const dispatch = (msg: Msg): void => {
      if (!alive) {
        return;
      }
      const prev = model;
      const [next, cmd] = program.update(
        msg,
        model,
      );
      model = next;
      schedulePaint();
      reflectUrl(prev, model);
      runCmd(cmd, dispatch);
      syncSubs();
    };
    const render = makeRenderer(
      container,
      dispatch,
    );
    // render the DOM, then merge the tree's atomic CSS into the managed sheet
    // (insert-only: exiting nodes still wear classes the new tree dropped)
    const paint = (html: Html<Msg>): void => {
      render(html);
      sheet.add(collectCssRules(html));
    };
    const subs = makeSubRuntime(dispatch, env);
    // reconcile the active subscriptions for the current model (no-op when the
    // program declares none).
    const syncSubs = (): void =>
      pipe(
        fromNullable(program.subscriptions),
        matchOption(
          (): void => undefined,
          (
            of: (model: Model) => Sub<Msg>,
          ): void => subs.reconcile(of(model)),
        ),
      );
    // model→URL reflection: a *reconciliation* of model→address-bar, NOT a
    // `Cmd` — deliberately kept outside effects even now that `Cmd` exists.
    // Folding it into `Cmd` would let app code emit raw history writes and
    // reopen the loop hazard; here it is gated on a string diff so it never
    // loops — a URL the user drove in via onUrlChange already equals
    // toUrl(model), so no spurious write.
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

    paint(program.view(model));
    runCmd(initCmd, dispatch);
    syncSubs();
    window.addEventListener(
      "popstate",
      onPopState,
    );
    document.addEventListener("click", onClick);

    return () => {
      alive = false;
      if (cancelPaint !== null) {
        cancelPaint();
        cancelPaint = null;
      }
      subs.disposeAll();
      window.removeEventListener(
        "popstate",
        onPopState,
      );
      document.removeEventListener(
        "click",
        onClick,
      );
      container.replaceChildren();
      sheet.dispose();
    };
  };
