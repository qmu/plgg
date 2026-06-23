import type {
  Suite,
  TestFn,
  TestMode,
} from "plgg-test/Core/types";

/**
 * Mutable counterpart of {@link Suite} used only while a spec module
 * is being imported. Registration is inherently a side-effecting
 * imperative seam — top-level `describe`/`test`/hook calls mutate the
 * current node — so the build phase uses a small mutable tree and a
 * cursor stack, then freezes it into the immutable {@link Suite}
 * domain type for the runner. This is the one place `let`/mutation is
 * justified (collecting import side-effects); everything downstream is
 * pure over the frozen tree.
 */
type MutSuite = {
  name: string;
  mode: TestMode;
  tests: Array<{
    name: string;
    fn: TestFn;
    mode: TestMode;
  }>;
  suites: Array<MutSuite>;
  beforeEach: Array<TestFn>;
  afterEach: Array<TestFn>;
};

const makeMutSuite = (
  name: string,
  mode: TestMode,
): MutSuite => ({
  name,
  mode,
  tests: [],
  suites: [],
  beforeEach: [],
  afterEach: [],
});

// The registration cursor stack. The last element is the suite that
// `test`/hook calls currently attach to. The root (index 0) is the
// per-file root suite, reset between files by `resetRegistry`.
let stack: Array<MutSuite> = [
  makeMutSuite("", "run"),
];

const current = (): MutSuite => {
  // stack always has the root; this is the irreducible imperative
  // seam, so the non-empty invariant is maintained by construction.
  const top = stack[stack.length - 1];
  return (
    top ?? stack[0] ?? makeMutSuite("", "run")
  );
};

/**
 * Clears the registry to a fresh root suite. Called by the runner
 * before importing each spec file so registrations never leak across
 * files.
 */
export const resetRegistry = (): void => {
  stack = [makeMutSuite("", "run")];
};

const freeze = (m: MutSuite): Suite => ({
  name: m.name,
  mode: m.mode,
  tests: m.tests.map((t) => ({
    name: t.name,
    fn: t.fn,
    mode: t.mode,
  })),
  suites: m.suites.map(freeze),
  hooks: {
    beforeEach: m.beforeEach.slice(),
    afterEach: m.afterEach.slice(),
  },
});

/**
 * Snapshots the current root suite as an immutable {@link Suite}. The
 * runner calls this after importing a file.
 */
export const takeRootSuite = (): Suite =>
  freeze(stack[0] ?? makeMutSuite("", "run"));

const addTest = (
  name: string,
  fn: TestFn,
  mode: TestMode,
): void =>
  void current().tests.push({
    name,
    fn,
    mode,
  });

const addSuite = (
  name: string,
  fn: () => void,
  mode: TestMode,
): void => {
  const node = makeMutSuite(name, mode);
  current().suites.push(node);
  // Push the new node, run its body (which registers children), then
  // pop — the classic describe-nesting walk.
  stack.push(node);
  fn();
  stack.pop();
};

/**
 * `test(name, fn)` — registers a runnable test on the current suite.
 * `test.skip(name, fn)` registers it as skipped.
 */
export const test: {
  (name: string, fn: TestFn): void;
  skip: (name: string, fn: TestFn) => void;
} = Object.assign(
  (name: string, fn: TestFn): void =>
    addTest(name, fn, "run"),
  {
    skip: (name: string, fn: TestFn): void =>
      addTest(name, fn, "skip"),
  },
);

/**
 * `it` is an exact alias of {@link test} — the corpus uses both.
 */
export const it = test;

/**
 * `describe(name, fn)` — opens a grouping suite; `fn` registers its
 * children. `describe.skip` marks the whole group skipped.
 */
export const describe: {
  (name: string, fn: () => void): void;
  skip: (name: string, fn: () => void) => void;
} = Object.assign(
  (name: string, fn: () => void): void =>
    addSuite(name, fn, "run"),
  {
    skip: (name: string, fn: () => void): void =>
      addSuite(name, fn, "skip"),
  },
);

/**
 * Registers a `beforeEach` hook on the current suite.
 */
export const beforeEach = (fn: TestFn): void =>
  void current().beforeEach.push(fn);

/**
 * Registers an `afterEach` hook on the current suite.
 */
export const afterEach = (fn: TestFn): void =>
  void current().afterEach.push(fn);
