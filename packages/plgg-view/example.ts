/**
 * plgg-view example — the minimal Elm Architecture (TEA) as a counter.
 *
 * Run it (in a browser, e.g. via Vite) against a page with `<div id="app">`:
 *   import "./example";
 *
 * Everything the app author writes is **pure**: an immutable `Model`, an
 * `update` that folds a `Msg` into the next model, and a `view` from the model
 * to `Html<Msg>`. The one imperative seam — the live model + DOM — is owned by
 * `sandbox`, the runtime. There is no `Cmd`/`Sub` and no virtual-DOM diffing:
 * every `Msg` recomputes `update` and re-renders the whole tree.
 *
 * For SSR, the same `view(init)` folds to a string through `renderToString`
 * (handlers dropped) — see `Html/usecase/renderToString.spec.ts`.
 */
import {
  div,
  button,
  span,
  text,
  onClick,
} from "plgg-view/index";
import { sandbox } from "plgg-view/client";

// --- Model: the whole app state is one immutable number ---
type Model = number;

// --- Msg: every change is data, never a callback mutating state ---
type Msg = "Increment" | "Decrement" | "Reset";

const init: Model = 0;

// --- update: pure (Msg, Model) => Model ---
const update = (msg: Msg, model: Model): Model =>
  msg === "Increment"
    ? model + 1
    : msg === "Decrement"
      ? model - 1
      : 0;

// --- view: pure Model => Html<Msg>; handlers produce Msg ---
const view = (model: Model) =>
  div([], [
    button([onClick<Msg>("Decrement")], [text("-")]),
    span([], [text(` ${model} `)]),
    button([onClick<Msg>("Increment")], [text("+")]),
    button([onClick<Msg>("Reset")], [text("reset")]),
  ]);

// --- the one imperative seam: mount the sandbox on #app ---
const root = document.getElementById("app");
if (root !== null) {
  // `sandbox(program)(container)` returns a cleanup; a real app keeps it to
  // tear the runtime down. Here the demo runs for the life of the page.
  sandbox({ init, update, view })(root);
}
