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
import { type AfterRender, makeProgramRenderer } from "plgg-view/Program/usecase/programRenderer";
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

/** A shell owns the URL and confirms navigation through its subscription.
 * current() reads this pane's projection of the committed route. request()
 * proposes a change; the shell may accept, redirect or ignore it. Update
 * current() before notifying subscribers, including on back/forward.
 */
export type ParentNavigation = Readonly<{
  current: () => Url;
  request: (
    url: Url,
    mode: "push" | "replace",
  ) => void;
  subscribe: (
    changed: (url: Url) => void,
  ) => () => void;
}>;

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
  init: (url: Url) => readonly [Model, Cmd<Msg>];
  update: (
    msg: Msg,
    model: Model,
  ) => readonly [Model, Cmd<Msg>];
  view: (model: Model) => Html<Msg>;
  afterRender?: AfterRender<Model>;
  onUrlChange: (url: Url) => Msg;
  navigation?: ParentNavigation;
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
 * current entry and `"push"` adds one that back/forward can traverse.
 */
const applyHistory = (
  mode: "push" | "replace",
  target: SoftStr,
): void => {
  if (mode === "push") {
    window.history.pushState(null, "", target);
  } else {
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
  event: Event,
): boolean =>
  !event.defaultPrevented &&
  "button" in event &&
  event.button === 0 &&
  "metaKey" in event &&
  event.metaKey === false &&
  "ctrlKey" in event &&
  event.ctrlKey === false &&
  "shiftKey" in event &&
  event.shiftKey === false &&
  "altKey" in event &&
  event.altKey === false;

/** Walks up to the nearest enclosing `<a>` (instanceof, no cast). */
const findAnchor = (
  target: EventTarget | null,
  root: Element,
): Option<HTMLAnchorElement> => {
  let el: Element | null =
    target instanceof Element ? target : null;
  while (el !== null) {
    if (el instanceof HTMLAnchorElement) {
      return some(el);
    }
    if (el === root) break;
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

const toUrl =
  (base: Url) =>
  (href: SoftStr): Option<URL> =>
    pipe(
      tryCatch(
        (h: SoftStr) =>
          new URL(
            h,
            new URL(
              base.path + base.search,
              window.location.href,
            ),
          ),
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
  event: Event,
  root: Element,
  base: Url,
): Option<Url> =>
  isPlainLeftClick(event)
    ? pipe(
        findAnchor(event.target, root),
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
        chainOption(toUrl(base)),
        chainOption((url: URL) =>
          isHttp(url) &&
          !url.href.includes("#") &&
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
 * renders the latest model and intercepts eligible links inside its container.
 * With a parent navigation owner, the shell confirms URL changes. Otherwise
 * this mount handles browser history and popstate. Teardown also disposes hosts.
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
    const owner = program.navigation;
    const readUrl = owner
      ? owner.current
      : currentUrl;
    const [initModel, initCmd] =
      program.init(readUrl());
    // mutable seams: the live model, an `alive` flag so an effect or
    // subscription resolving after teardown is dropped, and the frame-paint
    // bookkeeping — `paintPending` gates whether a NEW flush must be
    // scheduled (set true the instant one is requested, cleared the instant
    // it flushes), kept separate from `cancelPaint` (the seam's own cancel)
    // because `frameEnv.schedule` is allowed to call back SYNCHRONOUSLY (the
    // no-`requestAnimationFrame` fallback does): if the gate were "is there a
    // cancel" the synchronous callback would clear it before `schedule`
    // itself returns, and the later assignment of `schedule`'s return value
    // would stomp that clear right back to "pending" — silently dropping
    // every later dispatch's repaint for the rest of the mount's life.
    let model: Model = initModel;
    let alive = true;
    let paintPending = false;
    let cancelPaint: (() => void) | null = null;
    const sync = program.render === "sync";
    // Flushes the LATEST `model` through one `view()` + patch — read at flush
    // time (not schedule time), so N dispatches batched into one frame still
    // repaint only once, on the model the last of them produced.
    const flushPaint = (): void => {
      paintPending = false;
      cancelPaint = null;
      if (alive) {
        renderer.paint(model);
      }
    };
    // `"sync"` paints every dispatch immediately (no batching); the `"frame"`
    // default (and the absence of the field) schedules at most one pending
    // flush per frame — a second dispatch landing before it fires just
    // updates `model` for the SAME pending flush to pick up.
    const schedulePaint = (): void => {
      if (sync) {
        renderer.paint(model);
      } else if (!paintPending) {
        paintPending = true;
        cancelPaint =
          frameEnv.schedule(flushPaint);
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
      if (alive) reflectUrl(prev, model);
      if (alive) runCmd(cmd, dispatch);
      if (alive) syncSubs();
    };
    const renderer = makeProgramRenderer(container, dispatch, program.view, program.afterRender);
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
            const current = readUrl();
            if (
              target.path === current.path &&
              target.search === current.search
            )
              return;
            if (owner) {
              // An unrelated update must not resubmit a pending or denied request.
              const before = toUrl(prev);
              if (
                target.path === before.path &&
                target.search === before.search
              )
                return;
            }
            const mode = program.historyMode
              ? program.historyMode(prev, next)
              : "replace";
            if (mode === "none") return;
            if (owner)
              owner.request(target, mode);
            else
              applyHistory(
                mode,
                target.path + target.search,
              );
          },
        ),
      );
    const go = (url: Url): void => {
      if (alive)
        dispatch(program.onUrlChange(url));
    };

    const onClick = (event: Event): void => {
      pipe(
        navTarget(event, container, readUrl()),
        matchOption(
          () => undefined,
          (url: Url): void => {
            event.preventDefault();
            if (owner) owner.request(url, "push");
            else {
              applyHistory(
                "push",
                url.path + url.search,
              );
              go(url);
            }
          },
        ),
      );
    };
    const onPopState = (): void =>
      go(currentUrl());
    const stopNavigation = owner
      ? owner.subscribe(go)
      : (() => {
          window.addEventListener(
            "popstate",
            onPopState,
          );
          return () =>
            window.removeEventListener(
              "popstate",
              onPopState,
            );
        })();
    container.addEventListener("click", onClick);

    renderer.paint(model);
    runCmd(initCmd, dispatch);
    syncSubs();

    return () => {
      if (!alive) return;
      alive = false;
      paintPending = false;
      if (cancelPaint !== null) {
        cancelPaint();
        cancelPaint = null;
      }
      subs.disposeAll();
      stopNavigation();
      container.removeEventListener(
        "click",
        onClick,
      );
      renderer.dispose();
    };
  };
