import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { RELOAD_HOOK } from "plggpress/framework/DevServer/model/DevChannel";
import {
  type ArbiterState,
  RELOAD_HOOK_NAME,
  arbiterInit,
  stepArbiter,
} from "plggpress/framework/DevServer/browser/reloadArbiter";

// Every phase × message transition, asserted offline. The
// arbitration is the whole reason a live session survives an
// edit, so it is proven here rather than inferred from a
// browser session.

const listening: ArbiterState = {
  phase: "listening",
  pending: false,
};
const swapping: ArbiterState = {
  phase: "swapping",
  pending: false,
};
const swappingPending: ArbiterState = {
  phase: "swapping",
  pending: true,
};

test("the hook name the client installs is the one the reload client reads", () =>
  check(RELOAD_HOOK_NAME, toBe(RELOAD_HOOK)));

test("with no session, a frame still reloads the page", () =>
  check(
    stepArbiter(arbiterInit, "ReloadFrame"),
    toEqual([arbiterInit, "reload"]),
  ));

test("opening a session starts listening and does nothing yet", () =>
  check(
    stepArbiter(arbiterInit, "SessionOpened"),
    toEqual([listening, "hold"]),
  ));

test("with a session live, a frame swaps instead of reloading", () =>
  check(
    stepArbiter(listening, "ReloadFrame"),
    toEqual([swapping, "swap"]),
  ));

test("a frame arriving mid-swap is held, not dropped", () =>
  check(
    stepArbiter(swapping, "ReloadFrame"),
    toEqual([swappingPending, "hold"]),
  ));

test("a further frame mid-swap does not queue a second time", () =>
  check(
    stepArbiter(swappingPending, "ReloadFrame"),
    toEqual([swappingPending, "hold"]),
  ));

test("a finished swap replays exactly one held frame", () =>
  check(
    stepArbiter(swappingPending, "SwapDone"),
    toEqual([swapping, "swap"]),
  ));

test("a finished swap with nothing held returns to listening", () =>
  check(
    stepArbiter(swapping, "SwapDone"),
    toEqual([listening, "hold"]),
  ));

test("SwapDone outside a swap changes nothing", () =>
  all([
    check(
      stepArbiter(arbiterInit, "SwapDone"),
      toEqual([arbiterInit, "hold"]),
    ),
    check(
      stepArbiter(listening, "SwapDone"),
      toEqual([listening, "hold"]),
    ),
  ]));

test("closing the session hands the page back to plain hot reload", () =>
  all([
    check(
      stepArbiter(listening, "SessionClosed"),
      toEqual([arbiterInit, "hold"]),
    ),
    check(
      stepArbiter(
        swappingPending,
        "SessionClosed",
      ),
      toEqual([arbiterInit, "hold"]),
    ),
    // …and the very next frame reloads again
    check(
      stepArbiter(
        stepArbiter(
          listening,
          "SessionClosed",
        )[0],
        "ReloadFrame",
      ),
      toEqual([arbiterInit, "reload"]),
    ),
  ]));

test("reopening a session while swapping restarts cleanly", () =>
  check(
    stepArbiter(swappingPending, "SessionOpened"),
    toEqual([listening, "hold"]),
  ));
