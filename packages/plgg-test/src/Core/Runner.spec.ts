import {
  test,
  check,
  all,
  toBe,
} from "../index.js";
import { runFile } from "./Runner.js";
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

test("a fire-and-forget rejection fails the test (O2 window)", async () => {
  const results = await runFile(
    fixture("_unhandledFixture.spec.ts"),
  );
  const v = tally(results);
  return all([
    check(v.passed, toBe(1)),
    check(v.failed, toBe(1)),
  ]);
});

// DOM-environment seam (U1-dom). The fixture builds an element at
// module-eval time, so it loads at all only if happy-dom is installed
// BEFORE the import — its 3 tests passing proves the load-before-import
// guarantee end to end.
test("a @plgg-test-environment happy-dom spec gets a DOM", async () => {
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
    // `document`: `window`/`self`/`top` are happy-dom own-props too, and
    // a save/restore bug on any of them would re-install the closed
    // window and flip `typeof window` undefined→object for the next
    // (no-DOM) spec. Asserting they are all gone closes that blind spot.
    check("document" in globalThis, toBe(false)),
    check("window" in globalThis, toBe(false)),
    check("self" in globalThis, toBe(false)),
    check("top" in globalThis, toBe(false)),
  ]);
});
