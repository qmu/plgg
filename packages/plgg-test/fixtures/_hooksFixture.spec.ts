// Fixture: verifies beforeEach/afterEach run around EACH test, in
// order, including teardown after a passing test. Loaded by
// Runner.spec.ts.
import {
  test,
  expect,
  beforeEach,
  afterEach,
} from "plgg-test/index";

// Module-level log the hooks/tests append to; each test asserts the
// expected sequence so far. The mutation is the fixture's whole point.
const log: Array<string> = [];

beforeEach(() => {
  log.push("before");
});

afterEach(() => {
  log.push("after");
});

test("first test sees one before", () => {
  expect(log[log.length - 1]).toBe("before");
});

test("second test sees prior after then before", () => {
  // By now: before, after(first), before(this)
  expect(log).toEqual([
    "before",
    "after",
    "before",
  ]);
});
