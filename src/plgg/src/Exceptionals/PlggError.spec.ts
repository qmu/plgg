import { test, expect, assert, vi } from "vitest";
import {
  InvalidError,
  BaseError,
  Exception,
  SerializeError,
  DeserializeError,
  PlggError,
  invalidError$,
  exception$,
  serializeError$,
  deserializeError$,
  Time,
  Option,
  Obj,
  Str,
  Result,
  match,
  isBox,
  printPlggError,
  isPlggError,
  toError,
  unreachable,
  asSoftStr,
  asObj,
  forProp,
  forOptionProp,
  asTime,
  cast,
  refine,
  asStr,
} from "plgg/index";

test("PlggError.is type guard with InvalidError", () => {
  const error = new InvalidError({
    message: "Test error",
  });
  expect(isPlggError(error)).toBe(true);
});

test("PlggError.is type guard with BaseError", () => {
  const error = new BaseError("Test error");
  expect(isPlggError(error)).toBe(true);
});

test("PlggError.is type guard with regular Error", () => {
  const error = new Error("Test error");
  expect(isPlggError(error)).toBe(false);
});

test("PlggError.is type guard with non-error objects", () => {
  expect(isPlggError({})).toBe(false);
  expect(isPlggError(null)).toBe(false);
  expect(isPlggError(undefined)).toBe(false);
  expect(isPlggError("string")).toBe(false);
  expect(isPlggError(123)).toBe(false);
  expect(isPlggError([])).toBe(false);
});

test("PlggError.is checks brand property", () => {
  const validError = {
    __: "PlggError",
    message: "test",
  };
  expect(isPlggError(validError)).toBe(true);

  const invalidError = {
    __: "SomeOtherError",
    message: "test",
  };
  expect(isPlggError(invalidError)).toBe(false);

  const noBrandError = { message: "test" };
  expect(isPlggError(noBrandError)).toBe(false);
});

test("PlggError.debug with InvalidError", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const error = new InvalidError({
    message: "Test validation error",
  });
  printPlggError(error);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("[InvalidError]"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      "Test validation error",
    ),
  );

  consoleSpy.mockRestore();
});

test("PlggError.debug with nested errors", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const parentError = new InvalidError({
    message: "Parent error",
  });
  const childError = new InvalidError({
    message: "Child error",
    parent: parentError,
  });

  printPlggError(childError);

  expect(consoleSpy).toHaveBeenCalledTimes(2);
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Child error"),
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("Parent error"),
  );

  consoleSpy.mockRestore();
});

test("printPlggError with plain Error prints single line", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const plainError = new Error(
    "plain error",
  ) as unknown as InvalidError;
  printPlggError(plainError);

  expect(consoleSpy).toHaveBeenCalledTimes(1);
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("plain error"),
  );

  consoleSpy.mockRestore();
});

test("printPlggError prints no stack location when stack missing", () => {
  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  const error = new InvalidError({
    message: "no stack",
  });
  // Simulate an environment without stack frame detail.
  Object.defineProperty(error, "stack", {
    value: "",
    configurable: true,
  });
  printPlggError(error);
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining("no stack"),
  );

  consoleSpy.mockRestore();
});

test("toError returns the same instance for Error input", () => {
  const original = new Error("hi");
  expect(toError(original)).toBe(original);
});

test("toError wraps non-Error values", () => {
  expect(toError("oops").message).toBe("oops");
  expect(toError(42).message).toBe("42");
  expect(toError({ a: 1 }).message).toContain(
    "object",
  );
  expect(toError(null).message).toBe("null");
  expect(toError(undefined).message).toBe(
    "undefined",
  );
});

test("unreachable always throws", () => {
  expect(() => unreachable()).toThrow(
    "Supposed to be unreachable",
  );
});

test("InvalidError over cast pipeline", () => {
  type Id = string;
  const asId = (v: unknown) => cast(v, asSoftStr);

  type Name = Str;
  const asName = (v: unknown) =>
    cast(
      v,
      asSoftStr,
      refine(
        (str) => str.length >= 3,
        "Name must be at least 3 characters long",
      ),
      asStr,
    );

  type Article = Obj<{
    id: Id;
    createdAt: Time;
    name: Name;
    memo: Option<string>;
  }>;

  const asArticle = (
    v: unknown,
  ): Result<Article, InvalidError> =>
    cast(
      v,
      asObj,
      forProp("id", asId),
      forProp("createdAt", asTime),
      forProp("name", asName),
      forOptionProp("memo", asSoftStr),
    );

  const result = asArticle({
    id: 1,
    createdAt: "2024-01-01T00:00:00Z",
    name: "AB",
  });
  if (result.isErr()) {
    expect(result.content).toBeInstanceOf(
      InvalidError,
    );
    expect(result.content.sibling).toHaveLength(
      2,
    );
    return;
  }
  assert.fail(
    "Expected InvalidError but got success",
  );
});

test("a plgg error satisfies isBox and exposes its tag and structured content", () => {
  const e = new InvalidError({ message: "bad input" });
  expect(isBox(e)).toBe(true);
  expect(e.__tag).toBe("InvalidError");
  // content is a structured object payload, not the bare message string.
  expect(e.content).toEqual({
    message: "bad input",
    sibling: [],
  });
});

test("a PlggError folds exhaustively through match by tag", () => {
  // Omitting any one arm is a compile-time CoverageError — the union is
  // match-exhaustive. Each handler receives the variant narrowed to its class.
  const render = (e: PlggError): string =>
    match(e)(
      [
        invalidError$(),
        // content widened with sibling[] for the validation variant.
        (x) =>
          `invalid: ${x.content.message} (${x.content.sibling.length})`,
      ],
      [
        exception$(),
        (x) => `exception: ${x.content.message}`,
      ],
      [
        serializeError$(),
        (x) => `serialize: ${x.content.message}`,
      ],
      [
        deserializeError$(),
        (x) => `deserialize: ${x.content.message}`,
      ],
    );

  expect(
    render(new InvalidError({ message: "bad" })),
  ).equal("invalid: bad (0)");
  expect(render(new Exception("boom"))).equal(
    "exception: boom",
  );
  expect(
    render(new SerializeError({ message: "ser" })),
  ).equal("serialize: ser");
  expect(
    render(new DeserializeError({ message: "des" })),
  ).equal("deserialize: des");
});

test("the Box face is non-enumerable and the error stays a thrown Error", () => {
  const e = new InvalidError({ message: "bad" });
  // Still a real Error (stack traces, instanceof, throwability preserved).
  expect(e).toBeInstanceOf(Error);
  // __tag/content are prototype getters, not own enumerable fields, so they do
  // not change enumeration or JSON output.
  const ownKeys = Object.keys(e);
  expect(ownKeys).not.toContain("__tag");
  expect(ownKeys).not.toContain("content");
  expect("__tag" in JSON.parse(JSON.stringify(e))).toBe(
    false,
  );
});
