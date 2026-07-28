import { pathToFileURL } from "node:url";
import { isOk } from "plgg";
import type {
  Suite,
  TestCase,
  TestBody,
  HookFn,
  TestResult,
  Hooks,
} from "./types.js";
import {
  resetRegistry,
  takeRootSuite,
} from "./Registry.js";
import {
  isAssertion,
  failOf,
} from "../Matchers/Assertion.js";
import type { Assertion } from "../Matchers/Assertion.js";
import {
  environmentOf,
  installEnvironment,
} from "../Env/dom.js";
import {
  concurrencyOf,
  stubsGlobals,
} from "./scheduling.js";
import {
  enter,
  leave,
  inFlight,
  setCount,
} from "./inflight.js";

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

/**
 * How many tests/child-suites may be in flight at once inside one file.
 *
 * Default 4, overridable with `PLGG_TEST_CONCURRENCY`. A non-numeric or
 * non-positive value falls back to the default — a typo must not
 * silently serialize (or unbound) the run.
 */
export const DEFAULT_CONCURRENCY = 4;

export const concurrencyFrom = (
  raw: string | undefined,
): number => {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(n) && n > 0
    ? n
    : DEFAULT_CONCURRENCY;
};

/**
 * Runs one file's registered tree. `concurrency` defaults to the
 * environment setting; callers pass `1` to force strictly serial
 * execution (which is also what a DOM-environment file gets — its
 * `stubGlobal` mutates shared globals, so its tests must not overlap
 * until the isolation ticket lands).
 */
export const runFile = async (
  file: string,
  concurrency: number = concurrencyFrom(
    process.env.PLGG_TEST_CONCURRENCY,
  ),
): Promise<ReadonlyArray<TestResult>> => {
  resetRegistry();
  loadSeq = loadSeq + 1;
  // A DOM-needing spec declares its environment with a first-lines
  // directive; install it BEFORE the import so module-eval-time DOM
  // access (building elements at the top level) resolves — AND keep it
  // installed across `runSuite`, since the
  // test BODIES touch the DOM too. Teardown runs in `finally` so the
  // global is restored even if the spec fails to load: no leak into the
  // next file.
  const environment = environmentOf(file);
  const restore =
    await installEnvironment(environment);
  // Two reasons a file runs serially instead of concurrently:
  //   - it DECLARES an environment (`@plgg-test-environment dom`), whose
  //     install mutates process globals its tests would then race on;
  //   - it stubs a PROCESS-WIDE value (`vi.stubGlobal`/`vi.stubEnv`),
  //     detected from the source so the author need not declare it;
  //   - it declares `@plgg-test-concurrency 1` — the explicit opt-out
  //     for a file whose tests cannot overlap for a reason the runner
  //     cannot see (the one case here: a test that itself calls
  //     `runFile`, since registration is process-global).
  // `environmentOf` returns undefined for the plain no-directive case,
  // which is the concurrent one.
  const limit =
    environment === undefined && !stubsGlobals(file)
      ? (concurrencyOf(file) ?? concurrency)
      : 1;
  const outerEscapes = fileEscapes;
  fileEscapes = limit > 1 ? [] : undefined;
  // Give this file its own in-flight scope, so a NESTED run's tests are
  // not counted as siblings of the enclosing test (see Core/inflight.ts).
  const outerInFlight = inFlight();
  setCount(0);
  try {
    const loaded = await loadModule(
      file,
      String(loadSeq),
    );
    const results: ReadonlyArray<TestResult> = loaded.ok
      ? await runSuite(
          takeRootSuite(),
          [],
          {
            beforeEach: [],
            afterEach: [],
          },
          limit,
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
    return [...results, ...escapeResults(file)];
  } finally {
    setCount(outerInFlight);
    fileEscapes = outerEscapes;
    await restore();
  }
};

/**
 * Escaped fire-and-forget rejections captured while this file ran
 * CONCURRENTLY, folded into one synthetic failed result.
 *
 * Why the file and not the test: attributing a process-level
 * `unhandledRejection` to the exact test that started it needs
 * `async_hooks`, which is Node-only and therefore banned by the
 * mission's cross-runtime constraint. Picking "whichever test happened
 * to be innermost" would make the attribution depend on timing — the
 * same run could blame a different test each time, which is worse than
 * an honest file-level failure.
 *
 * So the guarantee is split, and BOTH halves are kept:
 *   - concurrent (the default): the file goes red, deterministically,
 *     and the message carries every escaped reason plus how to re-run
 *     for exact blame.
 *   - serial (`PLGG_TEST_CONCURRENCY=1`, a DOM file, or a serial block):
 *     exact per-test attribution, unchanged.
 * A dropped rejection never reads green either way — that is the
 * property that must not bend.
 */
const escapeResults = (
  file: string,
): ReadonlyArray<TestResult> =>
  fileEscapes === undefined ||
  fileEscapes.length === 0
    ? []
    : [
        {
          names: [file],
          outcome: "failed",
          durationMs: 0,
          message:
            `${fileEscapes.length} unhandled promise rejection(s) escaped while this file ran concurrently: ` +
            fileEscapes
              .map((e) => messageOf(e))
              .join("; ") +
            ". Re-run with PLGG_TEST_CONCURRENCY=1 to attribute it to a single test.",
          stack: "",
        },
      ];

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
  limit: number,
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
  // A serial suite is one indivisible unit: its own tests run in
  // registration order, and so does everything below it.
  const ownLimit = suite.mode === "serial" ? 1 : limit;
  // Concurrent by default: a suite's own tests, then its child suites,
  // run through a bounded pool. Results come back INDEXED, so the
  // reported order is registration order however execution interleaves —
  // the runner's output must not change shape run to run.
  const ownResults = await pool(
    ownLimit,
    suite.tests.map(
      (t) => () =>
        runTest(t, path, hooks, skipped),
    ),
  );
  const childHooks = skipped
    ? markSkipHooks(hooks)
    : hooks;
  // Serial children run in their OWN phase, one at a time, with nothing
  // else in flight — "does not interleave with any other test" is a
  // scheduling guarantee, not merely an internal ordering one, so it
  // cannot be delivered by handing the child a limit of 1 while its
  // concurrent siblings keep running beside it.
  const childResults: Array<
    ReadonlyArray<TestResult>
  > = [];
  const indexed = suite.suites.map(
    (child, index) => ({ child, index }),
  );
  const runChild =
    (
      entry: Readonly<{
        child: Suite;
        index: number;
      }>,
      childLimit: number,
    ) =>
    async (): Promise<void> => {
      childResults[entry.index] = await runSuite(
        entry.child,
        path,
        childHooks,
        childLimit,
      );
    };
  // Groups preserve REGISTRATION order: a run of consecutive concurrent
  // children becomes one pooled batch, and each serial child is its own
  // batch of one. So a serial block still sits exactly where the author
  // put it relative to its siblings — batching by mode across the whole
  // list would silently reorder execution, which is precisely the thing
  // an author reaches for `suite.serial` to control.
  await pool(
    1,
    childGroups(indexed).map(
      (group) => () =>
        pool(
          group.serial ? 1 : ownLimit,
          group.entries.map((e) =>
            runChild(e, group.serial ? 1 : ownLimit),
          ),
        ),
    ),
  );
  return [...ownResults, ...childResults.flat()];
};

type ChildEntry = Readonly<{
  child: Suite;
  index: number;
}>;

type ChildGroup = Readonly<{
  serial: boolean;
  entries: ReadonlyArray<ChildEntry>;
}>;

// Consecutive concurrent children coalesce into one group; every serial
// child stands alone.
const childGroups = (
  entries: ReadonlyArray<ChildEntry>,
): ReadonlyArray<ChildGroup> =>
  entries.reduce<Array<ChildGroup>>(
    (groups, entry) => {
      const serial = entry.child.mode === "serial";
      const last = groups[groups.length - 1];
      return last !== undefined &&
        !serial &&
        !last.serial
        ? [
            ...groups.slice(0, -1),
            {
              serial,
              entries: [...last.entries, entry],
            },
          ]
        : [...groups, { serial, entries: [entry] }];
    },
    [],
  );

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
  // Bracket the body so `vi` can tell whether a sibling test could
  // observe a process-wide stub (see Core/inflight.ts).
  enter();
  const failure = await execute(test.fn, hooks)
    .finally(leave);
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

// Escapes captured while the CURRENT file runs concurrently. `undefined`
// means the file is serial, so per-test attribution applies instead.
// Files are loaded and run one at a time (the CLI sequences them), and a
// NESTED run saves/restores this around itself, so a module-level slot is
// the right shape — there is never more than one current file.
let fileEscapes: Array<unknown> | undefined;

const ensureListener = (): void => {
  if (listenerInstalled) {
    return;
  }
  listenerInstalled = true;
  process.on(
    "unhandledRejection",
    (reason: unknown) => {
      // A concurrent file cannot say WHICH of its in-flight tests
      // started the rejected promise without `async_hooks` (Node-only,
      // banned cross-runtime), and guessing "the innermost window"
      // would make the blame depend on timing. Record it against the
      // file instead — deterministic, and still never green.
      if (fileEscapes !== undefined) {
        fileEscapes.push(reason);
        return;
      }
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

type Task<T> = Readonly<{
  index: number;
  run: () => Promise<T>;
}>;

/**
 * Runs thunks with at most `limit` in flight, returning their results
 * in INPUT order regardless of completion order. `limit` of 1 is exactly
 * the old sequential behaviour, which is what a serial block and a DOM
 * file get.
 *
 * Imperative seam: a bounded pool is workers pulling from one shared
 * queue until it is empty, which is a loop by nature. Everything the
 * loop touches is index-addressed, so ordering is never a function of
 * timing.
 */
const pool = async <T>(
  limit: number,
  thunks: ReadonlyArray<() => Promise<T>>,
): Promise<ReadonlyArray<T>> => {
  const results: Array<T> = [];
  const queue: Array<Task<T>> = thunks.map(
    (run, index) => ({ index, run }),
  );
  const worker = async (): Promise<void> => {
    for (
      let task = queue.shift();
      task !== undefined;
      task = queue.shift()
    ) {
      results[task.index] = await task.run();
    }
  };
  await Promise.all(
    Array.from({
      length: Math.max(
        1,
        Math.min(limit, thunks.length),
      ),
    }).map(worker),
  );
  return results;
};

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
