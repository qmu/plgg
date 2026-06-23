import { pathToFileURL } from "node:url";
import { isOk } from "plgg";
import type {
  Suite,
  TestCase,
  TestBody,
  HookFn,
  TestResult,
  Hooks,
} from "plgg-test/Core/types";
import {
  resetRegistry,
  takeRootSuite,
} from "plgg-test/Core/Registry";
import {
  isAssertion,
  failOf,
} from "plgg-test/Matchers/Assertion";
import type { Assertion } from "plgg-test/Matchers/Assertion";

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
// Monotonic counter making every `runFile` load a UNIQUE module URL.
// ES modules evaluate once per URL, so without this a second run of
// the same spec (a watch re-run, or one test that itself runs another
// spec via runFile) would hit the cached module and skip its top-level
// `test`/`describe` registrations. A fresh token per call forces
// re-evaluation of the spec module; its own imports stay cached, which
// is correct (we only want the spec body to re-register).
let loadSeq = 0;

export const runFile = async (
  file: string,
): Promise<ReadonlyArray<TestResult>> => {
  resetRegistry();
  loadSeq = loadSeq + 1;
  const loaded = await loadModule(
    file,
    String(loadSeq),
  );
  return loaded.ok
    ? runSuite(takeRootSuite(), [], {
        beforeEach: [],
        afterEach: [],
      })
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
  cacheBust: string,
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
  const url = `${pathToFileURL(file).href}?t=${cacheBust}`;
  try {
    await import(url);
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
): Promise<ReadonlyArray<TestResult>> => {
  const path =
    suite.name === ""
      ? ancestry
      : [...ancestry, suite.name];
  const skipped = suite.mode === "skip";
  const hooks = concatHooks(
    inherited,
    suite.hooks,
  );
  // Run this suite's own tests, then recurse into child suites,
  // preserving registration order. Sequential by design: stubGlobal
  // mutates shared globals, so parallelism would race.
  const ownResults = await sequence(
    suite.tests.map(
      (t) => () =>
        runTest(t, path, hooks, skipped),
    ),
  );
  const childResults = await sequence(
    suite.suites.map(
      (child) => () =>
        runSuite(
          child,
          path,
          skipped ? markSkipHooks(hooks) : hooks,
        ),
    ),
  );
  return [...ownResults, ...childResults.flat()];
};

// When a parent describe is skipped, children inherit skip; their
// hooks should not run, so we hand down empty hook lists.
const markSkipHooks = (_hooks: Hooks): Hooks => ({
  beforeEach: [],
  afterEach: [],
});

const runTest = async (
  test: TestCase,
  ancestry: ReadonlyArray<string>,
  hooks: Hooks,
  inheritedSkip: boolean,
): Promise<TestResult> => {
  const names = [...ancestry, test.name];
  if (inheritedSkip || test.mode === "skip") {
    return {
      names,
      outcome: "skipped",
      durationMs: 0,
      message: "",
      stack: "",
    };
  }
  const started = now();
  const failure = await execute(test.fn, hooks);
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

type StepResult = Readonly<{
  failed: boolean;
  message: string;
  stack: string;
}>;

const PASS: StepResult = {
  failed: false,
  message: "",
  stack: "",
};

// Runs beforeEach hooks, the test body, then afterEach hooks (always,
// even if the body failed), capturing the first failure. The body runs
// inside an UNHANDLED-REJECTION WINDOW so a fire-and-forget rejection
// (a promise the test starts but never awaits) still fails the test
// instead of escaping uncaught (O2). Precedence: a thrown/awaited
// failure first, then an escaped rejection, then a teardown failure.
const execute = async (
  body: TestBody,
  hooks: Hooks,
): Promise<StepResult> => {
  const before = await runSteps(hooks.beforeEach);
  const main = before.failed
    ? before
    : await foldBodyWithRejectionWindow(body);
  const after = await runSteps(hooks.afterEach);
  return main.failed ? main : after;
};

// A per-test rejection-capture window. Windows form a STACK so that
// nested runs (a test that itself runs `runFile`, e.g. plgg-test's own
// Runner.spec) attribute a fire-and-forget rejection to the INNERMOST
// active test only — a single process listener routes each event to
// the top window, instead of every overlapping listener double-failing.
type RejectionWindow = {
  captured: boolean;
  escaped: unknown;
};

// Imperative seam: process-level rejection capture is inherently
// effectful and stateful. The single listener is installed lazily once.
const windowStack: Array<RejectionWindow> = [];
let listenerInstalled = false;

const ensureListener = (): void => {
  if (listenerInstalled) {
    return;
  }
  listenerInstalled = true;
  process.on(
    "unhandledRejection",
    (reason: unknown) => {
      const top =
        windowStack[windowStack.length - 1];
      if (top !== undefined && !top.captured) {
        top.captured = true;
        top.escaped = reason;
      }
    },
  );
};

// Runs a test BODY inside the rejection window and FOLDS its returned
// value into a StepResult. The body's return IS the verdict:
//   - a branded Assertion → Ok=pass, Err=fail (message from Fail);
//   - a THROW / rejected promise → fail (defect safety net);
//   - ANYTHING ELSE (void, a bare domain Result, a non-Result truthy)
//     → fail "body did not return an assertion" — this is the
//     anti-false-green guard (a computed-but-dropped assertion can't
//     read green because the body then didn't RETURN an Assertion).
const foldBodyWithRejectionWindow = async (
  body: TestBody,
): Promise<StepResult> => {
  ensureListener();
  const win: RejectionWindow = {
    captured: false,
    escaped: undefined,
  };
  windowStack.push(win);
  try {
    // Boundary seam: a body may throw/reject; capturing that is the
    // runner's duty, so try/catch is irreducible here.
    const direct = await runBody(body);
    // Flush queues so a not-awaited rejection surfaces before verdict.
    await new Promise<void>((r) =>
      setTimeout(r, 0),
    );
    return direct.failed
      ? direct
      : win.captured
        ? {
            failed: true,
            message: `unhandled promise rejection: ${messageOf(win.escaped)}`,
            stack: stackOf(win.escaped),
          }
        : PASS;
  } finally {
    windowStack.pop();
  }
};

const runBody = async (
  body: TestBody,
): Promise<StepResult> => {
  try {
    const returned = await body();
    return foldAssertion(returned);
  } catch (e) {
    return {
      failed: true,
      message: messageOf(e),
      stack: stackOf(e),
    };
  }
};

// Folds the body's resolved RETURN VALUE. Only a branded Assertion is
// accepted as a verdict; everything else fails (guardrail 1 + 6).
const foldAssertion = (
  returned: Assertion,
): StepResult =>
  !isAssertion(returned)
    ? {
        failed: true,
        message:
          "test body did not return an assertion (it returned a non-Assertion value — a dropped/ignored assertion reads as failure, never green)",
        stack: "",
      }
    : isOk(returned)
      ? PASS
      : {
          failed: true,
          message: failOf(returned.content)
            .message,
          stack: "",
        };

// Runs the beforeEach/afterEach HOOKS (side-effecting, not assertions).
// A hook that throws/rejects fails the owning test (the defect net).
const runSteps = async (
  steps: ReadonlyArray<HookFn>,
): Promise<StepResult> =>
  steps.reduce<Promise<StepResult>>(
    async (accP, step) => {
      const acc = await accP;
      return acc.failed ? acc : guardHook(step);
    },
    Promise.resolve(PASS),
  );

const guardHook = async (
  fn: HookFn,
): Promise<StepResult> => {
  // Boundary seam: capturing a hook's thrown/rejected outcome is the
  // runner's duty, so try/catch is irreducible here.
  try {
    await fn();
    return PASS;
  } catch (e) {
    return {
      failed: true,
      message: messageOf(e),
      stack: stackOf(e),
    };
  }
};

// Sequences an array of thunks returning promises, in order.
const sequence = <T>(
  thunks: ReadonlyArray<() => Promise<T>>,
): Promise<ReadonlyArray<T>> =>
  thunks.reduce<Promise<Array<T>>>(
    async (accP, thunk) => {
      const acc = await accP;
      acc.push(await thunk());
      return acc;
    },
    Promise.resolve([]),
  );

const messageOf = (e: unknown): string =>
  e instanceof Error
    ? e.message
    : typeof e === "string"
      ? e
      : `non-error thrown: ${String(e)}`;

const stackOf = (e: unknown): string =>
  e instanceof Error && e.stack ? e.stack : "";

const now = (): number =>
  Number(process.hrtime.bigint()) / 1_000_000;
