// Public type surface for `plgg-test`, shipped as an AMBIENT module
// declaration.
//
// WHY ambient (not the generated per-file `.d.ts`): in TypeScript 6,
// an `asserts cond` function imported by NAME from a regular package
// `.d.ts` does NOT narrow at the call site (the consumer's
// `assert(isOk(x)); x.content` stops type-checking — TS2775 / the
// "every name in the call target needs an explicit annotation" rule).
// node's own `assert` avoids this via `export =` + a default import,
// but the corpus uses `import { assert } from "plgg-test"`. An ambient
// `declare module` is treated as part of the consuming program, so the
// `asserts` signature is honored. `assert` is the single export that
// requires narrowing, so correctness of the 448 `assert(isX(...))`
// call sites depends on this file.
//
// Keep these signatures in sync with `src/index.ts`'s re-exports. The
// surface is intentionally tiny (the closed set the corpus uses).

declare module "plgg-test" {
  /** Registers a runnable test; `.skip` marks it skipped. */
  export const test: {
    (
      name: string,
      fn: () => void | Promise<void>,
    ): void;
    skip: (
      name: string,
      fn: () => void | Promise<void>,
    ) => void;
  };

  /** Alias of {@link test}. */
  export const it: typeof test;

  /** Opens a grouping suite; `.skip` skips the group. */
  export const describe: {
    (name: string, fn: () => void): void;
    skip: (name: string, fn: () => void) => void;
  };

  export const beforeEach: (
    fn: () => void | Promise<void>,
  ) => void;
  export const afterEach: (
    fn: () => void | Promise<void>,
  ) => void;

  /** Asymmetric matcher (argument to `toHaveBeenCalledWith`). */
  type Asymmetric = Readonly<{
    __plggTestAsymmetric: true;
    test: (actual: unknown) => boolean;
    describe: string;
  }>;

  type Matchers = Readonly<{
    toBe: (expected: unknown) => void;
    equal: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toContain: (expected: unknown) => void;
    toHaveLength: (expected: number) => void;
    toHaveProperty: (
      path: string,
      value?: unknown,
    ) => void;
    toBeInstanceOf: (ctor: Function) => void;
    toBeUndefined: () => void;
    toBeDefined: () => void;
    toBeNull: () => void;
    toBeGreaterThan: (
      expected: number | bigint,
    ) => void;
    toBeGreaterThanOrEqual: (
      expected: number | bigint,
    ) => void;
    toThrow: (expected?: unknown) => void;
    toHaveBeenCalled: () => void;
    toHaveBeenCalledOnce: () => void;
    toHaveBeenCalledTimes: (n: number) => void;
    toHaveBeenCalledWith: (
      ...args: ReadonlyArray<unknown>
    ) => void;
  }>;

  type AsyncMatchers = Readonly<{
    toBe: (expected: unknown) => Promise<void>;
    toEqual: (expected: unknown) => Promise<void>;
    toBeUndefined: () => Promise<void>;
  }>;

  type Expectation = Matchers &
    Readonly<{
      not: Matchers;
      resolves: AsyncMatchers;
      rejects: AsyncMatchers;
    }>;

  export const expect: ((
    actual: unknown,
  ) => Expectation) & {
    stringContaining: (
      substring: string,
    ) => Asymmetric;
  };

  /**
   * Type-narrowing assertion. Declared here (ambient) precisely so the
   * `asserts condition` signature narrows at named-import call sites.
   */
  export function assert(
    condition: unknown,
    message?: string,
  ): asserts condition;
  export namespace assert {
    function fail(message?: string): never;
  }

  // A spy preserves its implementation's call signature (so
  // `vi.fn(async (url, init) => …)` keeps `url`/`init` typed) while
  // adding the recording surface.
  type Spy<
    A extends ReadonlyArray<unknown> =
      ReadonlyArray<unknown>,
    R = unknown,
  > = ((...args: A) => R) & {
    mock: {
      calls: Array<A>;
    };
    mockImplementation: (
      impl: (...args: A) => R,
    ) => Spy<A, R>;
    mockRestore: () => void;
  };

  export const vi: {
    fn: <
      A extends ReadonlyArray<unknown> =
        ReadonlyArray<unknown>,
      R = unknown,
    >(
      impl?: (...args: A) => R,
    ) => Spy<A, R>;
    spyOn: <T extends object>(
      target: T,
      key: keyof T,
    ) => Spy;
    stubGlobal: (
      key: string,
      value: unknown,
    ) => void;
    unstubAllGlobals: () => void;
    stubEnv: (key: string, value: string) => void;
    unstubAllEnvs: () => void;
  };

  export class AssertionError extends Error {
    readonly expected: string;
    readonly actual: string;
    constructor(args: {
      message: string;
      expected?: string;
      actual?: string;
    });
  }
}
