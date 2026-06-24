import type { Assertion } from "../Matchers/Assertion.js";

/**
 * A TEST body. Pipe-style redesign: the body RETURNS its assertion
 * verdict (an {@link Assertion}, sync or async) and the runner reads
 * that return value as the verdict — the body's return IS the verdict,
 * so a failing assertion can't be silently dropped. A body that
 * resolves to anything that is NOT a branded Assertion (void, a bare
 * domain Result, a non-Result) is FAILED by the runner ("body did not
 * return an assertion").
 */
export type TestBody = () =>
  | Assertion
  | Promise<Assertion>;

/**
 * A HOOK body (beforeEach/afterEach). Hooks do setup/teardown, not
 * assertions, so they stay side-effecting; a throw/rejection in a hook
 * still fails the owning test (the defect safety net).
 */
export type HookFn = () => void | Promise<void>;

/**
 * How a registered test should be treated by the runner.
 */
export type TestMode = "run" | "skip";

/**
 * A single registered test (the `it`/`test` unit). Pure data; the
 * runner consumes it.
 */
export type TestCase = Readonly<{
  name: string;
  fn: TestBody;
  mode: TestMode;
}>;

/**
 * Lifecycle hooks attached to a suite. Only the two the corpus uses
 * are modeled (beforeEach/afterEach); beforeAll/afterAll are out of
 * scope for v1.
 */
export type Hooks = Readonly<{
  beforeEach: ReadonlyArray<HookFn>;
  afterEach: ReadonlyArray<HookFn>;
}>;

/**
 * A `describe` grouping node — a tree of child suites and tests with
 * its own hooks. The file root is itself a suite (with an empty name).
 */
export type Suite = Readonly<{
  name: string;
  mode: TestMode;
  tests: ReadonlyArray<TestCase>;
  suites: ReadonlyArray<Suite>;
  hooks: Hooks;
}>;

/**
 * Outcome of running one test.
 */
export type Outcome =
  | "passed"
  | "failed"
  | "skipped";

/**
 * Flat result of one test after the runner walked the tree. `names`
 * is the describe-path plus the test name, for the reporter.
 */
export type TestResult = Readonly<{
  names: ReadonlyArray<string>;
  outcome: Outcome;
  durationMs: number;
  // Present only for `failed`. House style would prefer Option here,
  // but a plain Readonly with an explicit empty default keeps the
  // reporter fold trivial; absence is encoded as "".
  message: string;
  stack: string;
}>;

/**
 * Aggregate verdict the reporter folds results into; becomes the
 * process exit code (0 only when `failed === 0` AND at least the
 * expected tests ran — see Reporter).
 */
export type Verdict = Readonly<{
  passed: number;
  failed: number;
  skipped: number;
}>;
