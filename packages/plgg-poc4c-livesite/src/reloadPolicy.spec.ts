import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type PatchState,
  type PatchMsg,
  type ReloadAction,
  patchInit,
  stepPatch,
} from "./reloadPolicy.ts";

// The arbitration between the in-place patch and the dev
// server's hot reload — the mechanism PoC 4b avoided by
// retiring the iframe and 4c cannot avoid at all. The rule
// under test, in one line: absorb the reload our own edit
// caused, let every other reload through.

/** Drive a whole sequence; keep the actions it produced. */
const run = (
  msgs: ReadonlyArray<PatchMsg>,
): ReadonlyArray<ReloadAction> =>
  msgs.reduce<
    Readonly<{
      state: PatchState;
      actions: ReadonlyArray<ReloadAction>;
    }>
  >(
    (acc, msg) => {
      const [state, action] = stepPatch(
        acc.state,
        msg,
      );
      return {
        state,
        actions: [...acc.actions, action],
      };
    },
    { state: patchInit, actions: [] },
  ).actions;

const lastState = (
  msgs: ReadonlyArray<PatchMsg>,
): PatchState =>
  msgs.reduce<PatchState>(
    (state, msg) => stepPatch(state, msg)[0],
    patchInit,
  );

test("a reload nobody armed for goes straight through — PoC 4's hot reload is a recorded verdict and must not regress", () =>
  // The developer editing the corpus in their own editor
  // while the container serves.
  check(run(["ReloadFrame"]), toEqual(["reload"])));

test("the reload caused by OUR OWN landed edit is absorbed — the animation is the truth", () =>
  check(
    run(["Armed", "Patched", "ReloadFrame"]),
    toEqual(["hold", "hold", "hold"]),
  ));

test("a reload frame that BEATS the patch back is held, not obeyed — the race the arming exists for", () =>
  // The watcher can fire before our own HTTP response
  // returns. Unarmed, this reload would blow away the
  // patch that is about to arrive.
  check(
    run(["Armed", "ReloadFrame", "Patched"]),
    toEqual(["hold", "hold", "hold"]),
  ));

test("an UNMAPPABLE edit releases the held reload — the page must show the truth, not a stale render", () =>
  // The edit IS on disk. If we cannot animate it, the
  // reload is the only honest thing left, and the PoC
  // degrades to exactly PoC 4's behaviour.
  check(
    run(["Armed", "ReloadFrame", "Dropped"]),
    toEqual(["hold", "hold", "reload"]),
  ));

test("an unmappable edit whose reload has not arrived yet goes quiet, so the frame reloads when it lands", () =>
  all([
    check(
      run(["Armed", "Dropped"]),
      toEqual(["hold", "hold"]),
    ),
    check(
      run(["Armed", "Dropped", "ReloadFrame"]),
      toEqual(["hold", "hold", "reload"]),
    ),
  ]));

test("a REFUSED edit stands the client down — an armed client would swallow the next external reload", () =>
  all([
    check(
      lastState(["Armed", "Dropped"]),
      toEqual(patchInit),
    ),
    check(
      run(["Armed", "Dropped", "ReloadFrame"])[2],
      toBe("reload"),
    ),
  ]));

test("after absorbing its own trailing frame the client returns to quiet — the NEXT external edit still reloads", () =>
  check(
    run([
      "Armed",
      "Patched",
      "ReloadFrame",
      "ReloadFrame",
    ]),
    toEqual(["hold", "hold", "hold", "reload"]),
  ));

test("a second edit re-arms cleanly after a watched one", () =>
  check(
    run([
      "Armed",
      "Patched",
      "ReloadFrame",
      "Armed",
      "Patched",
      "ReloadFrame",
    ]),
    toEqual([
      "hold",
      "hold",
      "hold",
      "hold",
      "hold",
      "hold",
    ]),
  ));

test("arming always clears any previously held frame", () =>
  check(
    lastState(["Armed", "ReloadFrame", "Armed"]),
    toEqual({ phase: "armed", held: false }),
  ));

test("the initial state is quiet and holding nothing", () =>
  check(
    patchInit,
    toEqual({ phase: "quiet", held: false }),
  ));
