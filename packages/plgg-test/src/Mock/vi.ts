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
 */
export type Spy = ((
  ...args: ReadonlyArray<unknown>
) => unknown) & {
  mock: {
    calls: Array<
      ReadonlyArray<unknown>
    >;
  };
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

const makeFn = (
  impl?: (
    ...args: ReadonlyArray<unknown>
  ) => unknown,
): Spy => {
  const calls: Array<
    ReadonlyArray<unknown>
  > = [];
  const spy = (
    ...args: ReadonlyArray<unknown>
  ): unknown => {
    calls.push(args);
    return impl
      ? impl(...args)
      : undefined;
  };
  // The spy must carry its own `mock` record; attaching it after
  // construction is the irreducible imperative seam for a callable
  // object that is also data.
  const withMock = Object.assign(spy, {
    mock: { calls },
  });
  return withMock;
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
    savedGlobals.set(
      key,
      readGlobal(key),
    );
  }
  Object.defineProperty(
    globalThis,
    key,
    {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    },
  );
};

const unstubAllGlobals = (): void => {
  savedGlobals.forEach((saved, key) => {
    if (saved.present) {
      Object.defineProperty(
        globalThis,
        key,
        {
          value: saved.value,
          writable: true,
          configurable: true,
          enumerable: true,
        },
      );
    } else {
      Reflect.deleteProperty(
        globalThis,
        key,
      );
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
      Reflect.deleteProperty(
        process.env,
        key,
      );
    }
  });
  savedEnv.clear();
};

/**
 * The `vi` namespace object the corpus imports.
 */
export const vi = {
  fn: makeFn,
  stubGlobal,
  unstubAllGlobals,
  stubEnv,
  unstubAllEnvs,
};
