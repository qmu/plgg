/**
 * `vi` — the small test-double surface the corpus actually uses:
 * `fn`, `stubGlobal`/`unstubAllGlobals`, `stubEnv`/`unstubAllEnvs`.
 *
 * `vi.mock` (ESM module mocking) is intentionally NOT implemented
 * (Plan Amendment 2): the single spec that used it is migrated to
 * dependency injection instead, so no module-mock engine is built in
 * v1.
 */

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
// uses (spying on `console.log/error/debug`) are needed.
const spyOn = (
  target: Record<string, unknown>,
  key: string,
): Spy => {
  const original = target[key];
  const spy = makeFn(
    typeof original === "function"
      ? (...args) =>
          Reflect.apply(original, target, args)
      : undefined,
  );
  spy.mockRestore = (): void =>
    void (target[key] = original);
  // Patch the target. This mutation is the whole point of `spyOn`.
  target[key] = spy;
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

const stubGlobal = (
  key: string,
  value: unknown,
): void => {
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
