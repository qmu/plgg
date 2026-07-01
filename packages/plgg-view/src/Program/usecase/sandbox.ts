import { Html } from "plgg-view/Html/model/Html";
import { collectCssRules } from "plgg-view/Html/usecase/collectCss";
import { makeRenderer } from "plgg-view/Program/usecase/render";
import { makeSheet } from "plgg-view/Program/usecase/sheet";

/**
 * The minimal Elm Architecture program: an initial `Model`, a **pure**
 * `update` that folds a `Msg` into the next model, and a pure `view` from the
 * model to `Html<Msg>`. No `Cmd`, no `Sub` — the "sandbox" (Browser.sandbox)
 * shape. Effects are a deliberate non-goal of this minimum.
 */
export type Sandbox<Model, Msg> = Readonly<{
  init: Model;
  update: (msg: Msg, model: Model) => Model;
  view: (model: Model) => Html<Msg>;
}>;

/**
 * Runs a {@link Sandbox} against a DOM container: renders `view(init)`, then on
 * every dispatched `Msg` computes `update(msg, model)` and re-renders through
 * the diffing {@link makeRenderer} — only the changed DOM is touched, so a
 * focused input keeps its focus and caret. Returns a cleanup that empties the
 * container.
 *
 * The live `model` is the runtime's single mutable seam — the Elm Architecture
 * is imperative at exactly this point, so that everything the app author writes
 * (`init`/`update`/`view`) stays pure.
 */
export const sandbox =
  <Model, Msg>(program: Sandbox<Model, Msg>) =>
  (container: Element): (() => void) => {
    let model: Model = program.init;
    const sheet = makeSheet();
    const dispatch = (msg: Msg): void => {
      model = program.update(msg, model);
      paint(program.view(model));
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
    paint(program.view(model));
    return () => {
      container.replaceChildren();
      sheet.dispose();
    };
  };
