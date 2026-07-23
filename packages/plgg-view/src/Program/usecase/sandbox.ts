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
  runCmd,
  makeSubRuntime,
  browserSubEnv,
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
}>;

/**
 * Runs a {@link Sandbox} against a DOM container: paints `view(init)`, runs the
 * init `Cmd`, and starts the initial subscriptions; then on every dispatched
 * `Msg` folds `update`, re-renders through the diffing {@link makeRenderer}
 * (only changed DOM is touched — a focused input keeps its focus/caret), runs
 * the returned `Cmd`, and re-diffs `subscriptions(model)` by key. Returns a
 * cleanup that stops effects/subscriptions and empties the container.
 *
 * The live `model` and the `alive` flag are the runtime's mutable seams — the
 * Elm Architecture is imperative at exactly these points, so the app author's
 * code stays pure. `env` is injectable (default the real
 * `setInterval`/`window`) so tests drive timers/events deterministically,
 * mirroring the renderer's {@link Play} seam.
 */
export const sandbox =
  <Model, Msg>(
    program: Sandbox<Model, Msg>,
    env: SubEnv = browserSubEnv,
  ) =>
  (container: Element): (() => void) => {
    const [initModel, initCmd] = program.init;
    // mutable seams: the live model, and an `alive` flag so an effect or
    // subscription resolving after teardown is dropped.
    let model: Model = initModel;
    let alive = true;
    const sheet = makeSheet();
    const dispatch = (msg: Msg): void => {
      if (!alive) {
        return;
      }
      const [next, cmd] = program.update(
        msg,
        model,
      );
      model = next;
      paint(program.view(model));
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
      subs.disposeAll();
      container.replaceChildren();
      sheet.dispose();
    };
  };
