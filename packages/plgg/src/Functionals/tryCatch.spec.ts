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
  invalidError,
  tryCatch,
} from "plgg/index";

test("tryCatch wraps functions to handle exceptions", () => {
  // Example: Safe function execution
  const parseNumber = tryCatch(
    (input: string) => {
      const num = parseInt(input, 10);
      if (isNaN(num))
        throw new Error("Not a number");
      return num;
    },
    (error: unknown) =>
      invalidError({
        message: `Parse error: ${error}`,
      }),
  );

  return all([
    check(parseNumber("123"), okThen(toBe(123))),
    check(
      parseNumber("abc"),
      errThen((e) =>
        toContain("Parse error")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("tryCatch with default error handler", () => {
  // Test tryCatch without custom error handler
  const throwingFunction = (input: string) => {
    if (input === "error")
      throw new Error("Custom error");
    if (input === "string") throw "String error";
    return input.toUpperCase();
  };

  const safeThrowing = tryCatch(throwingFunction);

  return all([
    // default handler now yields a Defect (message + original in cause)
    check(
      safeThrowing("error"),
      errThen((e) =>
        toBe("Operation failed")(
          e.content.message,
        ),
      ),
    ),
    check(
      safeThrowing("string"),
      errThen((e) =>
        toBe("Operation failed")(
          e.content.message,
        ),
      ),
    ),
  ]);
});

test("tryCatch wraps async resolved promise in Ok", async () => {
  const loader = tryCatch(
    async (key: string) => `value-for-${key}`,
  );
  return check(
    await loader("a"),
    okThen(toBe("value-for-a")),
  );
});

test("tryCatch wraps async rejected promise in Err", async () => {
  const loader = tryCatch(
    async (_key: string) => {
      throw new Error("async failure");
    },
    (error: unknown) =>
      invalidError({
        message: `async: ${(error as Error).message}`,
      }),
  );
  return check(
    await loader("a"),
    errThen((e) =>
      toContain("async failure")(
        e.content.message,
      ),
    ),
  );
});

test("tryCatch async uses default error handler", async () => {
  const loader = tryCatch(async (_: string) => {
    throw new Error("boom");
  });
  return check(
    await loader("x"),
    errThen((e) =>
      toBe("Operation failed")(
        e.content.message,
      ),
    ),
  );
});
