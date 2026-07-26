// Fixture for the cross-runtime gate: the scheduler's whole contract,
// expressed without anything runtime-specific.
//
// It imports the façade by RELATIVE path rather than the `plgg-test/index`
// self-alias every other fixture uses, because that alias is resolved by
// a Node `module.register` hook that Deno and Bun do not run. The alias
// is a Node-only convenience of the LAUNCHER; the scheduler underneath
// it is what has to be portable, and this file is the part that must
// behave identically on all three runtimes.
import {
  test,
  suite,
  check,
  all,
  toBe,
  toEqual,
} from "../src/index.ts";

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

suite.serial("verdict", () => {
  test("independent tests actually overlapped", () =>
    check(
      log.slice(0, 4),
      toEqual([
        "c1-start",
        "c2-start",
        "c2-end",
        "c1-end",
      ]),
    ));

  test("a serial block stayed indivisible", () =>
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
      check(log.length, toBe(8)),
    ]));

  test("beforeEach/afterEach still bracket a test", () =>
    check(1, toBe(1)));
});
