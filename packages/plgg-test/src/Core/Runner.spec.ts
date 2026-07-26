// @plgg-test-concurrency 1
//
// These tests call `runFile` themselves, and registration
// (`resetRegistry`/`takeRootSuite`) plus the DOM environment install are
// process-global — two overlapping nested runs would reset the registry
// out from under each other. This is the file that proves the opt-out
// directive is load-bearing, not decorative.
import {
  test,
  check,
  all,
  toBe,
  toEqual,
  suite,
  describe,
} from "../index.js";
import {
  runFile,
  concurrencyFrom,
  DEFAULT_CONCURRENCY,
} from "./Runner.js";
import { concurrencyOf } from "../Env/dom.js";
import { tally } from "./Reporter.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixture = (name: string): string =>
  join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "fixtures",
    name,
  );

test("runs a mixed fixture: pass + sync fail + async reject", async () => {
  const results = await runFile(
    fixture("_mixedFixture.spec.ts"),
  );
  const v = tally(results);
  return all([
    check(v.passed, toBe(1)),
    check(v.failed, toBe(2)),
  ]);
});

test("hooks run around each test in order", async () => {
  const results = await runFile(
    fixture("_hooksFixture.spec.ts"),
  );
  const v = tally(results);
  // The fixture asserts hook ordering internally; all its tests pass.
  return all([
    check(v.failed, toBe(0)),
    check(v.passed, toBe(2)),
  ]);
});

test("describe nesting and skip", async () => {
  const results = await runFile(
    fixture("_nestingFixture.spec.ts"),
  );
  const v = tally(results);
  return all([
    check(v.skipped, toBe(1)),
    check(v.passed, toBe(2)),
  ]);
});

test("a spec that fails to load turns red", async () => {
  const results = await runFile(
    fixture("_loadErrorFixture.spec.ts"),
  );
  const v = tally(results);
  return check(v.failed, toBe(1));
});

// The anti-false-green guarantee (O2), in BOTH scheduling modes. A
// fire-and-forget rejection must never read green; what changes with
// concurrency is only how precisely it can be blamed.
test("serial: a fire-and-forget rejection fails ITS test (O2 window)", async () => {
  const results = await runFile(
    fixture("_unhandledFixture.spec.ts"),
    1,
  );
  const v = tally(results);
  return all([
    check(v.passed, toBe(1)),
    check(v.failed, toBe(1)),
  ]);
});

// Concurrently, the process-level `unhandledRejection` cannot be tied to
// the test that started it without `async_hooks` (Node-only, banned by
// the cross-runtime constraint), and blaming "the innermost open window"
// would make the verdict depend on timing. So the FILE goes red instead
// — deterministically, and still never green.
test("concurrent: the same rejection fails the FILE, never green", async () => {
  const results = await runFile(
    fixture("_unhandledFixture.spec.ts"),
    4,
  );
  const v = tally(results);
  const escape = results.filter((r) =>
    r.message.includes(
      "escaped while this file ran concurrently",
    ),
  );
  return all([
    check(v.failed, toBe(1)),
    check(escape.length, toBe(1)),
  ]);
});

// DOM-environment seam. The fixture builds an element at module-eval
// time, so it loads at all only if the in-house DOM is installed BEFORE
// the import — its 3 tests passing proves the load-before-import
// guarantee end to end.
test("a @plgg-test-environment dom spec gets a DOM", async () => {
  const results = await runFile(
    fixture("_domFixture.spec.ts"),
  );
  const v = tally(results);
  return all([
    check(v.passed, toBe(3)),
    check(v.failed, toBe(0)),
  ]);
});

// A no-directive spec runs under plain Node (no `document`), AND running
// it immediately AFTER the DOM fixture proves the per-file teardown
// restored `globalThis` — the DOM did not leak across files.
test("no-directive spec stays DOM-free even right after a DOM spec", async () => {
  await runFile(fixture("_domFixture.spec.ts"));
  const results = await runFile(
    fixture("_noDomFixture.spec.ts"),
  );
  const v = tally(results);
  return all([
    check(v.passed, toBe(1)),
    check(v.failed, toBe(0)),
    // The runner process itself is clean after teardown — NOT just
    // `document`: `window`/`self`/`top` are installed own-props too, and
    // a teardown bug on any of them would leave the window in place and
    // flip `typeof window` undefined→object for the next (no-DOM) spec.
    // Asserting they are all gone closes that blind spot.
    check("document" in globalThis, toBe(false)),
    check("window" in globalThis, toBe(false)),
    check("self" in globalThis, toBe(false)),
    check("top" in globalThis, toBe(false)),
  ]);
});

// --- Concurrency ---------------------------------------------------

test("concurrencyFrom: a valid setting is honoured", () =>
  all([
    check(concurrencyFrom("1"), toBe(1)),
    check(concurrencyFrom("8"), toBe(8)),
  ]));

test("concurrencyFrom: a bad setting falls back, never to 0 or NaN", () =>
  all([
    check(
      concurrencyFrom(undefined),
      toBe(DEFAULT_CONCURRENCY),
    ),
    check(
      concurrencyFrom(""),
      toBe(DEFAULT_CONCURRENCY),
    ),
    check(
      concurrencyFrom("lots"),
      toBe(DEFAULT_CONCURRENCY),
    ),
    check(
      concurrencyFrom("0"),
      toBe(DEFAULT_CONCURRENCY),
    ),
    check(
      concurrencyFrom("-2"),
      toBe(DEFAULT_CONCURRENCY),
    ),
  ]));

test("concurrencyOf: reads the per-file opt-out directive", () =>
  all([
    check(
      concurrencyOf(
        fixture("_hooksFixture.spec.ts"),
      ),
      toBe<number | undefined>(1),
    ),
    check(
      concurrencyOf(
        fixture("_mixedFixture.spec.ts"),
      ),
      toBe<number | undefined>(undefined),
    ),
  ]));

// Registration order is the CONTRACT of the report, and it must not
// become a function of which test finished first. Running the same file
// twice concurrently has to produce byte-identical result ordering.
test("concurrent results keep registration order, run to run", async () => {
  const once = await runFile(
    fixture("_nestingFixture.spec.ts"),
    4,
  );
  const twice = await runFile(
    fixture("_nestingFixture.spec.ts"),
    4,
  );
  return all([
    check(
      once.map((r) => r.names.join(" > ")),
      toEqual(
        twice.map((r) => r.names.join(" > ")),
      ),
    ),
    // …and identical to the serial ordering, so turning concurrency on
    // never reshuffles a report.
    check(
      once.map((r) => r.names.join(" > ")),
      toEqual(
        (
          await runFile(
            fixture("_nestingFixture.spec.ts"),
            1,
          )
        ).map((r) => r.names.join(" > ")),
      ),
    ),
  ]);
});

// --- suite.serial --------------------------------------------------

// The fixture asserts the non-interleave property from INSIDE the
// scheduler (the only place an interleave is observable) and reports it
// as two of its own tests; all six passing is the proof.
test("suite.serial runs as one indivisible unit while siblings overlap", async () => {
  const results = await runFile(
    fixture("_serialFixture.spec.ts"),
    4,
  );
  const v = tally(results);
  return all([
    check(v.passed, toBe(6)),
    check(v.failed, toBe(0)),
    // The REPORT stays registration-ordered however execution ran.
    check(
      results.map((r) => r.names.join(" > ")),
      toEqual([
        "concurrent block > c1",
        "concurrent block > c2",
        "serial block > s1",
        "serial block > s2",
        "verdict > the concurrent pair overlapped and finished out of order",
        "verdict > the serial block never interleaved",
      ]),
    ),
  ]);
});

// describe is the documented alias of suite, so the modifier rides along
// with it rather than being bolted onto one spelling.
test("describe.serial is the same modifier as suite.serial", () =>
  check(describe.serial === suite.serial, toBe(true)));
