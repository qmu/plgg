import {
  test,
  check,
  all,
  toBe,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import {
  Result,
  PromisedResult,
  ok,
  err,
  invalidError,
  bracket,
} from "plgg/index";

type Handle = { readonly id: number };

// A fresh acquire/release pair per test, tracking that release ran.
const scope = () => {
  const log: string[] = [];
  const acquire = (): Handle => {
    log.push("acquire");
    return { id: 1 };
  };
  const release = (h: Handle): void => {
    log.push(`release:${h.id}`);
  };
  return { log, acquire, release };
};

test("bracket releases and keeps the Ok body (sync)", () => {
  const { log, acquire, release } = scope();
  const result = bracket(
    acquire,
    (h: Handle): Result<string, never> =>
      ok(`used-${h.id}`),
    release,
  );
  return all([
    check(result, okThen(toBe("used-1"))),
    check(log.join(","), toBe("acquire,release:1")),
  ]);
});

test("bracket releases and keeps the Err body (sync)", () => {
  const { log, acquire, release } = scope();
  const result = bracket(
    acquire,
    () => err(invalidError({ message: "use failed" })),
    release,
  );
  return all([
    check(
      result,
      errThen((e) =>
        toContain("use failed")(e.content.message),
      ),
    ),
    check(log.join(","), toBe("acquire,release:1")),
  ]);
});

test("bracket releases when the body throws, as a Defect (sync)", () => {
  const { log, acquire, release } = scope();
  const result = bracket(
    acquire,
    (): Result<string, never> => {
      throw new Error("boom");
    },
    release,
  );
  return all([
    check(
      result,
      errThen((e) =>
        toContain("threw")(e.content.message),
      ),
    ),
    check(log.join(","), toBe("acquire,release:1")),
  ]);
});

test("bracket releases and keeps the Ok body (async)", async () => {
  const { log, acquire, release } = scope();
  const result = await bracket(
    acquire,
    async (h: Handle): PromisedResult<string, never> =>
      ok(`used-${h.id}`),
    release,
  );
  return all([
    check(result, okThen(toBe("used-1"))),
    check(log.join(","), toBe("acquire,release:1")),
  ]);
});

test("bracket releases and keeps the Err body (async)", async () => {
  const { log, acquire, release } = scope();
  const result = await bracket(
    acquire,
    async (): PromisedResult<string, ReturnType<typeof invalidError>> =>
      err(invalidError({ message: "async use failed" })),
    release,
  );
  return all([
    check(
      result,
      errThen((e) =>
        toContain("async use failed")(
          e.content.message,
        ),
      ),
    ),
    check(log.join(","), toBe("acquire,release:1")),
  ]);
});

test("bracket releases when the body rejects, as a Defect (async)", async () => {
  const { log, acquire, release } = scope();
  const result = await bracket(
    acquire,
    async (): PromisedResult<string, never> => {
      throw new Error("async boom");
    },
    release,
  );
  return all([
    check(
      result,
      errThen((e) =>
        toContain("rejected")(e.content.message),
      ),
    ),
    check(log.join(","), toBe("acquire,release:1")),
  ]);
});

test("bracket awaits an async release before the scope resolves", async () => {
  const log: string[] = [];
  const result = await bracket(
    (): Handle => ({ id: 7 }),
    async (h: Handle): PromisedResult<number, never> => {
      log.push("use");
      return ok(h.id);
    },
    async (h: Handle): Promise<void> => {
      await Promise.resolve();
      log.push(`release:${h.id}`);
    },
  );
  return all([
    check(result, okThen(toBe(7))),
    check(log.join(","), toBe("use,release:7")),
  ]);
});
