// @plgg-test-concurrency 1
//
// Fixture: verifies beforeEach/afterEach run around EACH test, in
// order, including teardown after a passing test. Loaded by
// Runner.spec.ts. Hooks are side-effecting (void); tests return an
// Assertion.
//
// The opt-out is the POINT of this fixture, not a workaround: it asserts
// a shared log ACROSS tests ("second test sees prior after then
// before"), which is a statement about execution order between tests.
// Concurrently that log is meaningless — both tests would run their
// beforeEach before either body. Hooks still bracket each test either
// way; what needs serial execution is the cross-test sequence. This is
// exactly the shape `suite.serial` exists for.
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
    toEqual(["before", "after", "before"]),
  ));
