import type {
  Suite,
  TestBody,
  HookFn,
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
    fn: TestBody;
    mode: TestMode;
  }>;
  suites: Array<MutSuite>;
  beforeEach: Array<HookFn>;
  afterEach: Array<HookFn>;
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

// Registration state. `root` is the per-file root suite (always a
// defined MutSuite — never indexed out of an array, so there are no
// unreachable "?? fallback" branches). `cursor` is the suite that
// `test`/hook calls currently attach to; `describe` re-points it while
// running a group body. Both reset between files.
let root: MutSuite = makeMutSuite("", "run");
let cursor: MutSuite = root;

const current = (): MutSuite => cursor;

/**
 * Clears the registry to a fresh root suite. Called by the runner
 * before importing each spec file so registrations never leak across
 * files.
 */
export const resetRegistry = (): void => {
  root = makeMutSuite("", "run");
  cursor = root;
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
  freeze(root);

const addTest = (
  name: string,
  fn: TestBody,
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
  const parent = cursor;
  parent.suites.push(node);
  // Re-point the cursor to the new node, run its body (which registers
  // children), then restore the parent — the describe-nesting walk.
  cursor = node;
  fn();
  cursor = parent;
};

/**
 * `test(name, fn)` — registers a runnable test on the current suite.
 * `test.skip(name, fn)` registers it as skipped.
 */
export const test: {
  (name: string, fn: TestBody): void;
  skip: (name: string, fn: TestBody) => void;
} = Object.assign(
  (name: string, fn: TestBody): void =>
    addTest(name, fn, "run"),
  {
    skip: (name: string, fn: TestBody): void =>
      addTest(name, fn, "skip"),
  },
);

/**
 * `it` is an exact alias of {@link test} — the corpus uses both.
 */
export const it = test;

/**
 * `suite(name, fn)` — opens a grouping suite; `fn` registers its
 * children. `suite.skip` marks the whole group skipped. (Named `suite`
 * in the pipe-style idiom; `describe` is kept as an alias.)
 */
export const suite: {
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
 * `describe` — alias of {@link suite}.
 */
export const describe = suite;

/**
 * Registers a `beforeEach` hook on the current suite.
 */
export const beforeEach = (fn: HookFn): void =>
  void current().beforeEach.push(fn);

/**
 * Registers an `afterEach` hook on the current suite.
 */
export const afterEach = (fn: HookFn): void =>
  void current().afterEach.push(fn);
