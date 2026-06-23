/**
 * Meta-harness — the bootstrap trust anchor (Plan Amendment 4).
 *
 * A test framework that tests itself with itself has a blind spot: if
 * the assertion engine is broken in a way that makes everything
 * "pass", its own green suite would lie. This file uses ONLY plain
 * `throw` / `console` (never plgg-test's own API) to prove the
 * load-bearing primitives before any self-spec is trusted:
 *
 *   1. a FAILING expect actually throws
 *   2. a PASSING expect does not throw
 *   3. the runner reports a failed test and the exit code is non-zero
 *   4. an async rejection inside a test is caught (no false green)
 *   5. `toEqual` deep-equals real plgg `Box`-shaped values
 *
 * Run directly: `node --experimental-strip-types --import <register>
 * src/Core/_meta.ts`. Prints `META OK` and exits 0 only if every
 * primitive holds; otherwise prints the failure and exits 1.
 */
import { expect } from "plgg-test/Expect/expect";
import { runFile } from "plgg-test/Core/Runner";
import { exitCodeFor } from "plgg-test/Core/Reporter";
import { tally } from "plgg-test/Core/Reporter";
import { ok, some } from "plgg";
import {
  fileURLToPath,
} from "node:url";
import {
  dirname,
  join,
} from "node:path";

// Plain assertion helper — deliberately not from plgg-test.
const check = (
  label: string,
  cond: boolean,
): void => {
  if (!cond) {
    console.error(
      `META FAIL: ${label}`,
    );
    process.exit(1);
  }
};

const threw = (
  fn: () => void,
): boolean => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

const main = async (): Promise<void> => {
  // 1. failing expect throws
  check(
    "failing expect throws",
    threw(() =>
      expect(1).toBe(2),
    ),
  );

  // 2. passing expect does not throw
  check(
    "passing expect does not throw",
    !threw(() =>
      expect(1).toBe(1),
    ),
  );

  // 5. toEqual deep-equals real plgg shapes (Box-shaped Ok/Some)
  check(
    "toEqual on plgg Ok",
    !threw(() =>
      expect(ok(42)).toEqual(
        ok(42),
      ),
    ),
  );
  check(
    "toEqual distinguishes plgg shapes",
    threw(() =>
      expect(ok(42)).toEqual(
        some(42),
      ),
    ),
  );

  // 3 & 4. run a real fixture file with a passing, a failing, and an
  // async-rejecting test; assert the runner's verdict + exit code.
  const here = dirname(
    fileURLToPath(import.meta.url),
  );
  const fixture = join(
    here,
    "..",
    "..",
    "fixtures",
    "_metaFixture.spec.ts",
  );
  const results = await runFile(
    fixture,
  );
  const v = tally(results);
  check(
    "runner counts 1 pass",
    v.passed === 1,
  );
  check(
    "runner counts 2 fails (sync + async reject)",
    v.failed === 2,
  );
  check(
    "non-zero exit when a test fails",
    exitCodeFor(v) === 1,
  );

  console.log("META OK");
  process.exit(0);
};

void main();
