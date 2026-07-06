/**
 * plgg-view example — the minimal Elm Architecture (TEA) as a counter.
 *
 * Run it (in a browser, e.g. via Vite) against a page with `<div id="app">`:
 *   import "./example";
 *
 * Everything the app author writes is **pure**: an immutable `Model`, an
 * `update` that folds a `Msg` into `[nextModel, Cmd]`, and a `view` from the
 * model to `Html<Msg>`. `Cmd`/`Sub` are pure DATA the app returns and the
 * runtime alone executes — so purity holds even WITH effects; this counter has
 * none, so every branch returns `cmdNone()`. The imperative seams — the live
 * model + DOM + effect execution — are owned by `sandbox`, the runtime, which
 * diffs the new `Html<Msg>` against the last and patches only what changed.
 *
 * For SSR, the same `view` of the initial model folds to a string through
 * `renderToString` (handlers dropped) — see
 * `Html/usecase/renderToString.spec.ts`.
 */
import {
  Html,
  div,
  button,
  span,
  text,
  onClick,
} from "plgg-view/index";
import {
  sandbox,
  cmdNone,
  type Cmd,
} from "plgg-view/client";
import { match } from "plgg";

// --- Model: the whole app state is one immutable number ---
type Model = number;

// --- Msg: every change is data, never a callback mutating state ---
type Msg = "Increment" | "Decrement" | "Reset";

// init is the initial `[Model, Cmd]` — no startup effect here.
const init: readonly [Model, Cmd<Msg>] = [
  0,
  cmdNone(),
];

// --- update: pure (Msg, Model) => [Model, Cmd] ---
// `match` is exhaustive over the `Msg` literal union — drop a case and it is a
// compile error. Every branch returns `[model, cmdNone()]`: a pure counter has
// no effects, but the shape is the same one an effectful app fills in.
const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] =>
  match(msg)(
    [
      "Increment" as const,
      (): readonly [Model, Cmd<Msg>] => [
        model + 1,
        cmdNone(),
      ],
    ],
    [
      "Decrement" as const,
      (): readonly [Model, Cmd<Msg>] => [
        model - 1,
        cmdNone(),
      ],
    ],
    [
      "Reset" as const,
      (): readonly [Model, Cmd<Msg>] => [
        0,
        cmdNone(),
      ],
    ],
  );

// --- view: pure Model => Html<Msg>; handlers produce Msg ---
// The `Html<Msg>` return annotation is the one type hint: it flows down as the
// contextual type for `div`/`button`/`onClick`, so each handler's `Msg` is the
// app union — no per-call `onClick<Msg>` needed.
const view = (model: Model): Html<Msg> =>
  div(
    [],
    [
      button([onClick("Decrement")], [text("-")]),
      span([], [text(` ${model} `)]),
      button([onClick("Increment")], [text("+")]),
      button([onClick("Reset")], [text("reset")]),
    ],
  );

// --- the one imperative seam: mount the sandbox on #app ---
const root = document.getElementById("app");
if (root !== null) {
  // `sandbox(program)(container)` returns a cleanup; a real app keeps it to
  // tear the runtime down. Here the demo runs for the life of the page.
  sandbox({ init, update, view })(root);
}
