import {
  AssertionError,
} from "plgg-test/Core/AssertionError";
import type { MatchResult } from "plgg-test/Expect/matchers";
import {
  toBe,
  toEqual,
  toContain,
  toHaveLength,
  toHaveProperty,
  toBeInstanceOf,
  toBeUndefined,
  toBeDefined,
  toBeNull,
  toBeGreaterThan,
  toBeGreaterThanOrEqual,
} from "plgg-test/Expect/matchers";
import { formatValue } from "plgg-test/Expect/format";
import { deepEqual } from "plgg-test/Expect/equals";
import { isSpy } from "plgg-test/Mock/vi";

/**
 * Applies a matcher verdict at the assertion boundary. THROWS on
 * failure (Plan Amendment 5) — this is the framework contract, not a
 * Result seam. `negate` flips both the pass test and the message.
 */
const settle = (
  result: MatchResult,
  negate: boolean,
): void => {
  const failed = negate
    ? result.pass
    : !result.pass;
  if (failed) {
    throw new AssertionError({
      message: negate
        ? result.notMessage
        : result.message,
    });
  }
};

/**
 * The synchronous matcher surface bound to one actual value.
 */
export type Matchers = Readonly<{
  toBe: (expected: unknown) => void;
  toEqual: (
    expected: unknown,
  ) => void;
  toContain: (
    expected: unknown,
  ) => void;
  toHaveLength: (
    expected: number,
  ) => void;
  toHaveProperty: (
    path: string,
    value?: unknown,
  ) => void;
  toBeInstanceOf: (
    ctor: Function,
  ) => void;
  toBeUndefined: () => void;
  toBeDefined: () => void;
  toBeNull: () => void;
  toBeGreaterThan: (
    expected: number | bigint,
  ) => void;
  toBeGreaterThanOrEqual: (
    expected: number | bigint,
  ) => void;
  toThrow: (
    expected?: unknown,
  ) => void;
  toHaveBeenCalled: () => void;
  toHaveBeenCalledOnce: () => void;
  toHaveBeenCalledTimes: (
    n: number,
  ) => void;
  toHaveBeenCalledWith: (
    ...args: ReadonlyArray<unknown>
  ) => void;
}>;

// Builds the matcher set for one actual value; `negate` selects the
// `expect(...)` vs `expect(...).not` flavor — the second arg count
// indicates whether toHaveProperty got a value.
const buildMatchers = (
  actual: unknown,
  negate: boolean,
): Matchers => ({
  toBe: (expected) =>
    settle(
      toBe(actual, expected),
      negate,
    ),
  toEqual: (expected) =>
    settle(
      toEqual(actual, expected),
      negate,
    ),
  toContain: (expected) =>
    settle(
      toContain(actual, expected),
      negate,
    ),
  toHaveLength: (expected) =>
    settle(
      toHaveLength(actual, expected),
      negate,
    ),
  toHaveProperty: (path, ...rest) =>
    settle(
      toHaveProperty(
        actual,
        path,
        rest.length > 0,
        rest[0],
      ),
      negate,
    ),
  toBeInstanceOf: (ctor) =>
    settle(
      toBeInstanceOf(actual, ctor),
      negate,
    ),
  toBeUndefined: () =>
    settle(
      toBeUndefined(actual),
      negate,
    ),
  toBeDefined: () =>
    settle(
      toBeDefined(actual),
      negate,
    ),
  toBeNull: () =>
    settle(toBeNull(actual), negate),
  toBeGreaterThan: (expected) =>
    settle(
      toBeGreaterThan(actual, expected),
      negate,
    ),
  toBeGreaterThanOrEqual: (expected) =>
    settle(
      toBeGreaterThanOrEqual(
        actual,
        expected,
      ),
      negate,
    ),
  toThrow: (expected) =>
    settle(
      matchThrow(actual, expected),
      negate,
    ),
  toHaveBeenCalled: () =>
    settle(
      matchCalled(actual),
      negate,
    ),
  toHaveBeenCalledOnce: () =>
    settle(
      matchCalledTimes(actual, 1),
      negate,
    ),
  toHaveBeenCalledTimes: (n) =>
    settle(
      matchCalledTimes(actual, n),
      negate,
    ),
  toHaveBeenCalledWith: (...args) =>
    settle(
      matchCalledWith(actual, args),
      negate,
    ),
});

// `toThrow`: `actual` must be a thunk. Calls it; passes if it threw,
// and (when `expected` given) if the thrown error matches by message
// substring (string), constructor (function), or thrown value
// (Error/other) via message containment.
const matchThrow = (
  actual: unknown,
  expected: unknown,
): MatchResult => {
  if (
    typeof actual !== "function"
  ) {
    return {
      pass: false,
      message: `toThrow expects a function, received ${formatValue(actual)}`,
      notMessage: `toThrow expects a function`,
    };
  }
  const caught = runCatch(actual);
  return caught.threw
    ? {
        pass: throwMatches(
          caught.error,
          expected,
        ),
        message: `expected thrown ${formatValue(caught.error)} to match ${formatValue(expected)}`,
        notMessage: `expected function not to throw ${formatValue(expected)}`,
      }
    : {
        pass: false,
        message: `expected function to throw`,
        notMessage: `expected function not to throw, and it did not`,
      };
};

const runCatch = (
  fn: Function,
): Readonly<{
  threw: boolean;
  error: unknown;
}> => {
  // Boundary seam: `toThrow` exists precisely to observe a thrown
  // value, so a try/catch is irreducible here (not domain code).
  try {
    fn();
    return {
      threw: false,
      error: undefined,
    };
  } catch (e) {
    return { threw: true, error: e };
  }
};

const throwMatches = (
  error: unknown,
  expected: unknown,
): boolean =>
  expected === undefined
    ? true
    : typeof expected === "string"
      ? messageOf(error).includes(
          expected,
        )
      : typeof expected ===
          "function"
        ? error instanceof expected
        : expected instanceof Error
          ? messageOf(error).includes(
              expected.message,
            )
          : false;

const messageOf = (
  error: unknown,
): string =>
  error instanceof Error
    ? error.message
    : String(error);

const matchCalled = (
  actual: unknown,
): MatchResult => ({
  pass:
    isSpy(actual) &&
    actual.mock.calls.length > 0,
  message: `expected spy to have been called`,
  notMessage: `expected spy not to have been called`,
});

const matchCalledTimes = (
  actual: unknown,
  n: number,
): MatchResult => ({
  pass:
    isSpy(actual) &&
    actual.mock.calls.length === n,
  message: `expected spy to have been called ${n} time(s), got ${isSpy(actual) ? actual.mock.calls.length : "non-spy"}`,
  notMessage: `expected spy not to have been called ${n} time(s)`,
});

const matchCalledWith = (
  actual: unknown,
  args: ReadonlyArray<unknown>,
): MatchResult => ({
  pass:
    isSpy(actual) &&
    actual.mock.calls.some((call) =>
      argsEqual(call, args),
    ),
  message: `expected spy to have been called with ${formatValue(args)}`,
  notMessage: `expected spy not to have been called with ${formatValue(args)}`,
});

// `toHaveBeenCalledWith` uses deep equality on each argument.
const argsEqual = (
  a: ReadonlyArray<unknown>,
  b: ReadonlyArray<unknown>,
): boolean =>
  a.length === b.length &&
  a.every((v, i) =>
    deepEqual(v, b[i]),
  );

/**
 * The async adapter for `.resolves` / `.rejects`. Awaits the promise,
 * then applies the inner matcher to the resolved value (or to the
 * rejection reason for `.rejects`). Returns a Promise the test body
 * must `await` — the corpus does (`await expect(p).resolves.toBe(x)`).
 */
export type AsyncMatchers = Readonly<{
  toBe: (
    expected: unknown,
  ) => Promise<void>;
  toEqual: (
    expected: unknown,
  ) => Promise<void>;
  toBeUndefined: () => Promise<void>;
}>;

const settleAsync = async (
  promise: Promise<unknown>,
  wantReject: boolean,
  apply: (value: unknown) => void,
): Promise<void> => {
  // Boundary seam: adapting a Promise to a sync matcher is exactly
  // an await + observe-rejection, so try/catch is irreducible here.
  const outcome = await observe(
    promise,
  );
  if (wantReject) {
    if (!outcome.rejected) {
      throw new AssertionError({
        message: `expected promise to reject, but it resolved with ${formatValue(outcome.value)}`,
      });
    }
    apply(outcome.value);
  } else {
    if (outcome.rejected) {
      throw new AssertionError({
        message: `expected promise to resolve, but it rejected with ${formatValue(outcome.value)}`,
      });
    }
    apply(outcome.value);
  }
};

const observe = async (
  promise: Promise<unknown>,
): Promise<
  Readonly<{
    rejected: boolean;
    value: unknown;
  }>
> => {
  try {
    return {
      rejected: false,
      value: await promise,
    };
  } catch (e) {
    return {
      rejected: true,
      value: e,
    };
  }
};

const buildAsync = (
  promise: Promise<unknown>,
  wantReject: boolean,
): AsyncMatchers => ({
  toBe: (expected) =>
    settleAsync(
      promise,
      wantReject,
      (v) => settle(toBe(v, expected), false),
    ),
  toEqual: (expected) =>
    settleAsync(
      promise,
      wantReject,
      (v) =>
        settle(
          toEqual(v, expected),
          false,
        ),
    ),
  toBeUndefined: () =>
    settleAsync(
      promise,
      wantReject,
      (v) =>
        settle(
          toBeUndefined(v),
          false,
        ),
    ),
});

/**
 * The full expectation handle: sync matchers, `.not`, and the
 * `.resolves`/`.rejects` async adapters.
 */
export type Expectation = Matchers &
  Readonly<{
    not: Matchers;
    resolves: AsyncMatchers;
    rejects: AsyncMatchers;
  }>;

const toPromise = (
  actual: unknown,
): Promise<unknown> =>
  actual instanceof Promise
    ? actual
    : Promise.resolve(actual);

/**
 * `expect(actual)` — the entry of the assertion boundary.
 */
export const expect = (
  actual: unknown,
): Expectation => ({
  ...buildMatchers(actual, false),
  not: buildMatchers(actual, true),
  resolves: buildAsync(
    toPromise(actual),
    false,
  ),
  rejects: buildAsync(
    toPromise(actual),
    true,
  ),
});
