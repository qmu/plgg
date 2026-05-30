import { Html } from "plgg-view/Html/model/Html";
import { render } from "plgg-view/Program/usecase/render";

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
 * every dispatched `Msg` computes `update(msg, model)` and re-renders the whole
 * tree (full re-render — no diffing). Returns a cleanup that empties the
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
    const dispatch = (msg: Msg): void => {
      model = program.update(msg, model);
      render(
        program.view(model),
        container,
        dispatch,
      );
    };
    render(program.view(model), container, dispatch);
    return () => container.replaceChildren();
  };
