// Fixture: verifies beforeEach/afterEach run around EACH test, in
// order, including teardown after a passing test. Loaded by
// Runner.spec.ts. Hooks are side-effecting (void); tests return an
// Assertion.
import {
  test,
  check,
  toEqual,
  beforeEach,
  afterEach,
} from "plgg-test/index";

const log: Array<string> = [];

beforeEach(() => {
  log.push("before");
});

afterEach(() => {
  log.push("after");
});

test("first test sees one before", () =>
  check(log, toEqual(["before"])));

test("second test sees prior after then before", () =>
  // By now: before, after(first), before(this)
  check(
    log,
    toEqual([
      "before",
      "after",
      "before",
    ]),
  ));
