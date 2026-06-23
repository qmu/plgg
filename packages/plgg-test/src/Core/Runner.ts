import { pathToFileURL } from "node:url";
import type {
  Suite,
  TestCase,
  TestFn,
  TestResult,
  Hooks,
} from "plgg-test/Core/types";
import {
  resetRegistry,
  takeRootSuite,
} from "plgg-test/Core/Registry";
import {
  AssertionError,
  isAssertionError,
} from "plgg-test/Core/AssertionError";

/**
 * Imports one spec file and returns its registered suite tree. The
 * import is the registration trigger (top-level `test`/`describe`
 * calls mutate the registry); we reset first so files never leak into
 * each other.
 *
 * A throw during import (e.g. a syntax/type error in the spec) is
 * surfaced as a single synthetic failed result, never swallowed — a
 * spec that fails to load must turn the run red.
 */
export const runFile = async (
  file: string,
): Promise<
  ReadonlyArray<TestResult>
> => {
  resetRegistry();
  const loaded = await loadModule(
    file,
  );
  return loaded.ok
    ? runSuite(
        takeRootSuite(),
        [],
        {
          beforeEach: [],
          afterEach: [],
        },
      )
    : [
        {
          names: [file],
          outcome: "failed",
          durationMs: 0,
          message: `failed to load spec: ${loaded.message}`,
          stack: loaded.stack,
        },
      ];
};

const loadModule = async (
  file: string,
): Promise<
  Readonly<{
    ok: boolean;
    message: string;
    stack: string;
  }>
> => {
  // Boundary seam: dynamic import is the effect; a load failure must
  // be captured (not thrown into the runner), so try/catch is
  // irreducible here.
  try {
    await import(
      pathToFileURL(file).href
    );
    return {
      ok: true,
      message: "",
      stack: "",
    };
  } catch (e) {
    return {
      ok: false,
      message: messageOf(e),
      stack: stackOf(e),
    };
  }
};

// Inherited hooks accumulate outermost-first for beforeEach and are
// reversed for afterEach so teardown runs innermost-first.
const concatHooks = (
  inherited: Hooks,
  own: Hooks,
): Hooks => ({
  beforeEach: [
    ...inherited.beforeEach,
    ...own.beforeEach,
  ],
  afterEach: [
    ...own.afterEach,
    ...inherited.afterEach,
  ],
});

const runSuite = async (
  suite: Suite,
  ancestry: ReadonlyArray<string>,
  inherited: Hooks,
): Promise<
  ReadonlyArray<TestResult>
> => {
  const path =
    suite.name === ""
      ? ancestry
      : [...ancestry, suite.name];
  const skipped =
    suite.mode === "skip";
  const hooks = concatHooks(
    inherited,
    suite.hooks,
  );
  // Run this suite's own tests, then recurse into child suites,
  // preserving registration order. Sequential by design: stubGlobal
  // mutates shared globals, so parallelism would race.
  const ownResults =
    await sequence(
      suite.tests.map(
        (t) => () =>
          runTest(
            t,
            path,
            hooks,
            skipped,
          ),
      ),
    );
  const childResults = await sequence(
    suite.suites.map(
      (child) => () =>
        runSuite(
          child,
          path,
          skipped
            ? markSkipHooks(hooks)
            : hooks,
        ),
    ),
  );
  return [
    ...ownResults,
    ...childResults.flat(),
  ];
};

// When a parent describe is skipped, children inherit skip; their
// hooks should not run, so we hand down empty hook lists.
const markSkipHooks = (
  _hooks: Hooks,
): Hooks => ({
  beforeEach: [],
  afterEach: [],
});

const runTest = async (
  test: TestCase,
  ancestry: ReadonlyArray<string>,
  hooks: Hooks,
  inheritedSkip: boolean,
): Promise<TestResult> => {
  const names = [
    ...ancestry,
    test.name,
  ];
  if (
    inheritedSkip ||
    test.mode === "skip"
  ) {
    return {
      names,
      outcome: "skipped",
      durationMs: 0,
      message: "",
      stack: "",
    };
  }
  const started = now();
  const failure = await execute(
    test.fn,
    hooks,
  );
  const durationMs = now() - started;
  return failure.failed
    ? {
        names,
        outcome: "failed",
        durationMs,
        message: failure.message,
        stack: failure.stack,
      }
    : {
        names,
        outcome: "passed",
        durationMs,
        message: "",
        stack: "",
      };
};

// Runs beforeEach hooks, the test body, then afterEach hooks (always,
// even if the body failed), capturing the first failure. Also fails
// the test on an escaped unhandled rejection during the body window.
const execute = async (
  body: TestFn,
  hooks: Hooks,
): Promise<
  Readonly<{
    failed: boolean;
    message: string;
    stack: string;
  }>
> => {
  const before = await runSteps(
    hooks.beforeEach,
  );
  const main = before.failed
    ? before
    : await guard(body);
  const after = await runSteps(
    hooks.afterEach,
  );
  // The body/before failure takes precedence; a teardown failure only
  // surfaces if the test was otherwise green.
  return main.failed
    ? main
    : after;
};

const runSteps = async (
  steps: ReadonlyArray<TestFn>,
): Promise<
  Readonly<{
    failed: boolean;
    message: string;
    stack: string;
  }>
> =>
  steps.reduce<
    Promise<
      Readonly<{
        failed: boolean;
        message: string;
        stack: string;
      }>
    >
  >(
    async (accP, step) => {
      const acc = await accP;
      return acc.failed
        ? acc
        : guard(step);
    },
    Promise.resolve({
      failed: false,
      message: "",
      stack: "",
    }),
  );

// Awaits a test/hook fn, converting any throw OR promise rejection
// into a captured failure. This is THE false-negative guard (Plan
// Amendment / design): an async body whose promise rejects must fail,
// never silently pass.
const guard = async (
  fn: TestFn,
): Promise<
  Readonly<{
    failed: boolean;
    message: string;
    stack: string;
  }>
> => {
  // Boundary seam: capturing a test's thrown/rejected outcome is the
  // runner's core duty, so try/catch is irreducible here.
  try {
    await fn();
    return {
      failed: false,
      message: "",
      stack: "",
    };
  } catch (e) {
    return {
      failed: true,
      message: isAssertionError(e)
        ? e.message
        : messageOf(e),
      stack: stackOf(e),
    };
  }
};

// Sequences an array of thunks returning promises, in order.
const sequence = <T>(
  thunks: ReadonlyArray<
    () => Promise<T>
  >,
): Promise<ReadonlyArray<T>> =>
  thunks.reduce<Promise<Array<T>>>(
    async (accP, thunk) => {
      const acc = await accP;
      acc.push(await thunk());
      return acc;
    },
    Promise.resolve([]),
  );

const messageOf = (
  e: unknown,
): string =>
  e instanceof Error
    ? e.message
    : typeof e === "string"
      ? e
      : `non-error thrown: ${String(e)}`;

const stackOf = (
  e: unknown,
): string =>
  e instanceof Error && e.stack
    ? e.stack
    : "";

const now = (): number =>
  Number(process.hrtime.bigint()) /
  1_000_000;

// Re-export so the meta-harness can construct the same error type.
export { AssertionError };
