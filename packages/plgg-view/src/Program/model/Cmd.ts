import {
  type Box,
  type Icon,
  box,
  icon,
  pattern,
} from "plgg";

/**
 * An effect the runtime performs on the app's behalf, as PURE DATA constructed
 * by app code and executed ONLY by the runtime — so `update` stays a pure,
 * unit-testable function that RETURNS effects and never performs them.
 *
 * A closed union:
 * - `CmdNone` — no effect (the pure branches of `update`).
 * - `CmdBatch` — run several commands, in array order.
 * - `CmdEffect` — a DEFERRED computation `() => Promise<Msg>` the runtime
 *   invokes after paint; the `Msg` it resolves to is dispatched (and dropped
 *   if it resolves after teardown).
 *
 * `CmdEffect` IS the typed custom-effect seam: an HTTP call via plgg-fetch, a
 * timer, or D12's ephemeral-key minting are all a `cmdEffect` wrapping a
 * deferred computation — ZERO plgg-view edits per new effect kind. Fold a
 * `Result`/`proc` chain to a `Msg` INSIDE the thunk (e.g. `matchResult` on the
 * awaited value), so the effect always resolves to a message — success OR
 * handled failure — and the error path is the app's data, never a throw the
 * runtime must guess at. DOM-free (SSR-safe, importable in Node).
 */
export type Cmd<Msg> =
  | Icon<"CmdNone">
  | Box<"CmdBatch", ReadonlyArray<Cmd<Msg>>>
  | Box<"CmdEffect", () => Promise<Msg>>;

/** Pattern matchers for folding a {@link Cmd} with `match`. */
export const cmdNone$ = () =>
  pattern("CmdNone")();
export const cmdBatch$ = () =>
  pattern("CmdBatch")();
export const cmdEffect$ = () =>
  pattern("CmdEffect")();

/**
 * No effect. Carries no `Msg`, so it is `Cmd<never>` — usable in any
 * `Cmd<Msg>` position (the pure branches of `update`).
 */
export const cmdNone = (): Cmd<never> =>
  icon("CmdNone");

/** Run several commands, in array order. */
export const cmdBatch = <Msg>(
  cmds: ReadonlyArray<Cmd<Msg>>,
): Cmd<Msg> => box("CmdBatch")(cmds);

/**
 * A deferred computation the runtime runs after paint, dispatching the `Msg` it
 * resolves to. Construction performs NOTHING — the thunk is data until the
 * runtime invokes it. Fold any `Result` inside the thunk to a `Msg` so the
 * promise always resolves (success or handled failure).
 */
export const cmdEffect = <Msg>(
  run: () => Promise<Msg>,
): Cmd<Msg> => box("CmdEffect")(run);
