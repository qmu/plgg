import {
  pipe,
  matchOption,
  fromNullable,
} from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import { collectCssRules } from "plgg-view/Html/usecase/collectCss";
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
 * The Elm Architecture program WITH effects (D2): an initial `[Model, Cmd]`, a
 * **pure** `update` folding a `Msg` into `[nextModel, Cmd]`, a pure `view`, and
 * an optional `subscriptions`. `Cmd`/`Sub` are PURE DATA the app returns and
 * the runtime alone executes — so everything the author writes
 * (`init`/`update`/`view`/`subscriptions`) stays pure and unit-testable; it now
 * *returns* effects instead of having none.
 *
 * DOCTRINE AMENDMENT (D2, roadmap
 * `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`): this module once
 * documented "No `Cmd`, no `Sub`" as a deliberate minimum. D2 takes the break
 * openly (breaking-changes-OK — plgg is its own only consumer): there is ONE
 * runtime signature, effects included. A branch with no effect returns
 * `[model, cmdNone()]`.
 */
export type Sandbox<Model, Msg> = Readonly<{
  init: readonly [Model, Cmd<Msg>];
  update: (
    msg: Msg,
    model: Model,
  ) => readonly [Model, Cmd<Msg>];
  view: (model: Model) => Html<Msg>;
  subscriptions?: (model: Model) => Sub<Msg>;
  /**
   * How a dispatch schedules its paint — the same knob as
   * `Application.render` (see `application.ts`), since a `sandbox` app can
   * drive just as many out-of-order `Cmd`-resolved dispatches as an
   * `application` one and deserves the same one-paint-per-frame collapse.
   * `"frame"` (the default) batches every dispatch landing within the same
   * browser frame into ONE `view()` call and ONE patch; `"sync"` paints
   * immediately after every dispatch (today's pre-batching behaviour) — the
   * deterministic choice for a spec that asserts DOM state right after a
   * synchronous dispatch with no frame to flush.
   */
  render?: "frame" | "sync";
}>;

/**
 * Runs a {@link Sandbox} against a DOM container: paints `view(init)`, runs the
 * init `Cmd`, and starts the initial subscriptions; then on every dispatched
 * `Msg` folds `update` and schedules a paint through the diffing
 * {@link makeRenderer} (only changed DOM is touched — a focused input keeps its
 * focus/caret), runs the returned `Cmd`, and re-diffs `subscriptions(model)` by
 * key. Returns a cleanup that stops effects/subscriptions, cancels a pending
 * paint, and empties the container.
 *
 * The live `model`, the `alive` flag, and the frame-paint bookkeeping
 * (`paintPending`/`cancelPaint`) are the runtime's mutable seams — the Elm
 * Architecture is imperative at exactly these points, so the app author's code
 * stays pure. `env`/`frameEnv` are injectable (default the real
 * `setInterval`/`window`/`requestAnimationFrame`) so tests drive
 * timers/events/frames deterministically, mirroring the renderer's {@link Play}
 * seam and `application.ts`'s identical frame-batching seam.
 */
export const sandbox =
  <Model, Msg>(
    program: Sandbox<Model, Msg>,
    env: SubEnv = browserSubEnv,
    frameEnv: FrameEnv = browserFrameEnv,
  ) =>
  (container: Element): (() => void) => {
    const [initModel, initCmd] = program.init;
    // mutable seams: the live model, an `alive` flag so an effect or
    // subscription resolving after teardown is dropped, and the frame-paint
    // bookkeeping (see application.ts's identical seam for why `paintPending`
    // is kept separate from `cancelPaint`: `frameEnv.schedule` may call back
    // synchronously).
    let model: Model = initModel;
    let alive = true;
    let paintPending = false;
    let cancelPaint: (() => void) | null = null;
    const sync = program.render === "sync";
    const sheet = makeSheet();
    // Flushes the LATEST `model` through one `view()` + patch — read at flush
    // time (not schedule time), so N dispatches batched into one frame still
    // repaint only once, on the model the last of them produced.
    const flushPaint = (): void => {
      paintPending = false;
      cancelPaint = null;
      if (alive) {
        paint(program.view(model));
      }
    };
    const schedulePaint = (): void => {
      if (sync) {
        paint(program.view(model));
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
      const [next, cmd] = program.update(
        msg,
        model,
      );
      model = next;
      schedulePaint();
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
    paint(program.view(model));
    runCmd(initCmd, dispatch);
    syncSubs();
    return () => {
      alive = false;
      paintPending = false;
      if (cancelPaint !== null) {
        cancelPaint();
        cancelPaint = null;
      }
      subs.disposeAll();
      container.replaceChildren();
      sheet.dispose();
    };
  };
