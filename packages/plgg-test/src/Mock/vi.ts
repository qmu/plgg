/**
 * `vi` — the small test-double surface the corpus actually uses:
 * `fn`, `stubGlobal`/`unstubAllGlobals`, `stubEnv`/`unstubAllEnvs`.
 *
 * `vi.mock` (ESM module mocking) is intentionally NOT implemented
 * (Plan Amendment 2): the single spec that used it is migrated to
 * dependency injection instead, so no module-mock engine is built in
 * v1.
 */
import { inFlight } from "../Core/inflight.js";

/**
 * A recording spy. `mock.calls` is the array of argument tuples, in
 * call order — the data the `toHaveBeenCalled*` matchers read.
 * `mockImplementation` swaps the body (chainable, returns the spy);
 * `mockRestore` undoes a `spyOn` patch.
 */
export type Spy = ((
  ...args: ReadonlyArray<unknown>
) => unknown) & {
  mock: {
    calls: Array<ReadonlyArray<unknown>>;
  };
  mockImplementation: (
    impl: (
      ...args: ReadonlyArray<unknown>
    ) => unknown,
  ) => Spy;
  mockRestore: () => void;
};

/**
 * Type guard for a {@link Spy}, so matchers can read `.mock.calls`
 * without a cast.
 */
export const isSpy = (
  value: unknown,
): value is Spy =>
  typeof value === "function" &&
  "mock" in value &&
  typeof value.mock === "object" &&
  value.mock !== null &&
  "calls" in value.mock &&
  Array.isArray(value.mock.calls);

type Impl = (
  ...args: ReadonlyArray<unknown>
) => unknown;

const makeFn = (impl?: Impl): Spy => {
  const calls: Array<ReadonlyArray<unknown>> = [];
  // The current implementation is mutable so `mockImplementation` can
  // swap it — the one piece of spy state that changes after creation.
  const state: { impl: Impl | undefined } = {
    impl,
  };
  const spy = (
    ...args: ReadonlyArray<unknown>
  ): unknown => {
    calls.push(args);
    return state.impl
      ? state.impl(...args)
      : undefined;
  };
  // The spy must carry its own `mock` record + chainable methods;
  // attaching them after construction is the irreducible imperative
  // seam for a callable object that is also data. `mockRestore` is a
  // no-op for a plain `vi.fn`; `spyOn` overrides it (below).
  const withMock: Spy = Object.assign(spy, {
    mock: { calls },
    mockImplementation: (next: Impl): Spy => {
      state.impl = next;
      return withMock;
    },
    mockRestore: (): void => undefined,
  });
  return withMock;
};

// `spyOn(target, key)` replaces `target[key]` with a spy that, by
// default, still calls the original; `mockImplementation` overrides it
// and `mockRestore` puts the original back. Only the shapes the corpus
// uses (spying on `console.log/error/debug`) are needed. `Reflect`
// get/set are used for the swap so the property mutation type-checks
// over an arbitrary object key without an `as` cast.
const spyOn = <T extends object>(
  target: T,
  key: keyof T,
): Spy => {
  const original = Reflect.get(target, key);
  const spy = makeFn(
    typeof original === "function"
      ? (...args) =>
          Reflect.apply(original, target, args)
      : undefined,
  );
  spy.mockRestore = (): void =>
    void Reflect.set(target, key, original);
  // Patch the target. This mutation is the whole point of `spyOn`.
  Reflect.set(target, key, spy);
  return spy;
};

// Saved global/env values to restore. The empty-string key sentinel
// is avoided by storing presence explicitly.
const savedGlobals = new Map<
  string,
  { present: boolean; value: unknown }
>();
const savedEnv = new Map<
  string,
  { present: boolean; value: string }
>();

const readGlobal = (
  key: string,
): { present: boolean; value: unknown } =>
  key in globalThis
    ? {
        present: true,
        value: new Map(
          Object.entries(globalThis),
        ).get(key),
      }
    : { present: false, value: undefined };

/**
 * Refuses a process-wide stub issued while a sibling test could observe
 * it.
 *
 * `scheduling.ts` auto-serializes any spec whose SOURCE mentions
 * `stubGlobal`/`stubEnv`, which covers the normal case without asking
 * the author for a directive. This is the backstop for what that scan
 * cannot see — a stub issued from a helper module, or through an alias.
 *
 * It THROWS rather than warning: a global quietly swapped underneath a
 * concurrent test produces a wrong answer, and a wrong answer that reads
 * green is the one outcome this runner exists to prevent. The throw
 * fails the owning test with a message that names the fix.
 */
const guardConcurrentStub = (
  api: string,
  key: string,
): void => {
  if (inFlight() > 1) {
    throw new Error(
      `vi.${api}("${key}") was called while ${inFlight()} tests were running concurrently. ` +
        "A process-wide stub is visible to every test in flight, so this would " +
        "silently corrupt a sibling. Put the suite in `suite.serial(...)`, or add " +
        "`// @plgg-test-concurrency 1` to the top of the file.",
    );
  }
};

const stubGlobal = (
  key: string,
  value: unknown,
): void => {
  guardConcurrentStub("stubGlobal", key);
  if (!savedGlobals.has(key)) {
    savedGlobals.set(key, readGlobal(key));
  }
  Object.defineProperty(globalThis, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};

const unstubAllGlobals = (): void => {
  savedGlobals.forEach((saved, key) => {
    if (saved.present) {
      Object.defineProperty(globalThis, key, {
        value: saved.value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  });
  savedGlobals.clear();
};

const stubEnv = (
  key: string,
  value: string,
): void => {
  guardConcurrentStub("stubEnv", key);
  if (!savedEnv.has(key)) {
    const prev = process.env[key];
    savedEnv.set(
      key,
      prev === undefined
        ? { present: false, value: "" }
        : { present: true, value: prev },
    );
  }
  process.env[key] = value;
};

const unstubAllEnvs = (): void => {
  savedEnv.forEach((saved, key) => {
    if (saved.present) {
      process.env[key] = saved.value;
    } else {
      Reflect.deleteProperty(process.env, key);
    }
  });
  savedEnv.clear();
};

/**
 * The `vi` namespace object the corpus imports.
 */
export const vi = {
  fn: makeFn,
  spyOn,
  stubGlobal,
  unstubAllGlobals,
  stubEnv,
  unstubAllEnvs,
};
