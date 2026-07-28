// Fixture: proves `suite.serial` is indivisible while everything around
// it is concurrent. Loaded by Runner.spec.ts, which only has to check
// that all of these pass — the property is asserted HERE, from inside
// the scheduler's own execution, which is the only place the interleave
// is observable.
//
// Each body marks its start, yields to the event loop, then marks its
// end, so an interleave shows up in the log as a foreign entry between a
// test's own start and end rather than merely being possible. The
// concurrent pair yields for DIFFERENT durations so completion order can
// diverge from registration order.
import {
  test,
  suite,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test/index";

const log: Array<string> = [];

const yieldTurn = (ms: number): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, ms),
  );

const step = async (
  name: string,
  ms: number,
) => {
  log.push(`${name}-start`);
  await yieldTurn(ms);
  log.push(`${name}-end`);
  return check(1, toBe(1));
};

suite("concurrent block", () => {
  test("c1", () => step("c1", 30));
  test("c2", () => step("c2", 5));
});

suite.serial("serial block", () => {
  test("s1", () => step("s1", 20));
  test("s2", () => step("s2", 20));
});

// Runs after both blocks: itself serial, and registered last, so the
// scheduler reaches it only once everything above has settled.
suite.serial("verdict", () => {
  test("the concurrent pair overlapped and finished out of order", () =>
    check(
      log.slice(0, 4),
      toEqual([
        "c1-start",
        "c2-start",
        "c2-end",
        "c1-end",
      ]),
    ));

  test("the serial block never interleaved", () =>
    all([
      check(
        log.slice(4, 8),
        toEqual([
          "s1-start",
          "s1-end",
          "s2-start",
          "s2-end",
        ]),
      ),
      // Nothing from any other block landed inside the serial window.
      check(log.length, toBe(8)),
    ]));
});
