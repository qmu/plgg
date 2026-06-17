import { test, expect, assert, vi } from "vitest";
import {
  PlggError,
  InvalidError,
  invalidError,
  invalidError$,
  serializeError,
  serializeError$,
  deserializeError,
  deserializeError$,
  defect,
  defect$,
  box,
  Time,
  Option,
  Obj,
  Str,
  Result,
  match,
  isBox,
  isSome,
  printPlggError,
  isPlggError,
  toError,
  panic,
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

test("isPlggError recognizes every core error variant", () => {
  expect(
    isPlggError(invalidError({ message: "x" })),
  ).toBe(true);
  expect(
    isPlggError(serializeError({ message: "x" })),
  ).toBe(true);
  expect(
    isPlggError(deserializeError({ message: "x" })),
  ).toBe(true);
  expect(isPlggError(defect("x"))).toBe(true);
});

test("isPlggError rejects non-plgg values", () => {
  expect(isPlggError(new Error("x"))).toBe(false);
  expect(isPlggError({})).toBe(false);
  expect(isPlggError(null)).toBe(false);
  expect(isPlggError(undefined)).toBe(false);
  expect(isPlggError("string")).toBe(false);
  expect(isPlggError(123)).toBe(false);
  expect(isPlggError([])).toBe(false);
  // a Box with a non-core tag is not a PlggError
  expect(isPlggError(box("Other")({}))).toBe(
    false,
  );
  // a tag-colliding box without a string message is rejected (shape guard)
  expect(
    isPlggError(
      box("InvalidError")({ totally: "wrong" }),
    ),
  ).toBe(false);
  expect(isPlggError(box("Defect")({}))).toBe(
    false,
  );
});

test("cast captures an unexpected step throw as a serializable cause", () => {
  const boom = (
    _v: unknown,
  ): Result<number, InvalidError> => {
    throw new Error("kaboom");
  };
  const result = cast(1, boom);
  assert(result.isErr());
  expect(result.content.__tag).toBe(
    "InvalidError",
  );
  expect(
    result.content.content.message,
  ).toContain("kaboom");
  // the origin is retained as a serializable cause, not flattened away
  expect(
    isSome(result.content.content.cause),
  ).toBe(true);
});

test("printPlggError prints tag and message", () => {
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  printPlggError(
    invalidError({
      message: "Test validation error",
    }),
  );
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining("[InvalidError]"),
  );
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining(
      "Test validation error",
    ),
  );
  spy.mockRestore();
});

test("printPlggError walks validation siblings", () => {
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  const child = invalidError({
    message: "Child error",
  });
  const parent = invalidError({
    message: "Parent error",
    sibling: [child],
  });
  printPlggError(parent);
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining("Parent error"),
  );
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining("Child error"),
  );
  spy.mockRestore();
});

test("printPlggError unwraps a Defect's Error cause", () => {
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  printPlggError(
    defect("wrapped", new Error("root cause")),
  );
  expect(spy).toHaveBeenCalledTimes(2);
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining("wrapped"),
  );
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining("root cause"),
  );
  spy.mockRestore();
});

test("toError returns the same instance for Error input", () => {
  const original = new Error("hi");
  expect(toError(original)).toBe(original);
});

test("toError synthesizes for tagged data and primitives", () => {
  expect(
    toError(invalidError({ message: "bad" }))
      .message,
  ).toContain("InvalidError");
  expect(toError("oops").message).toBe("oops");
  expect(toError(42).message).toBe("42");
  expect(toError(null).message).toBe("null");
});

test("panic throws the extracted Error", () => {
  expect(() =>
    panic(invalidError({ message: "boom" })),
  ).toThrow("InvalidError");
});

test("unreachable always throws", () => {
  expect(() => unreachable()).toThrow(
    "Supposed to be unreachable",
  );
});

test("InvalidError over cast pipeline", () => {
  type Id = string;
  const asId = (v: unknown) =>
    cast(v, asSoftStr);

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
    expect(result.content.__tag).toBe(
      "InvalidError",
    );
    expect(result.content.content.sibling).toHaveLength(
      2,
    );
    return;
  }
  assert.fail(
    "Expected InvalidError but got success",
  );
});

test("a plgg error satisfies isBox and exposes its tag and structured content", () => {
  const e = invalidError({
    message: "bad input",
  });
  expect(isBox(e)).toBe(true);
  expect(e.__tag).toBe("InvalidError");
  expect(e.content.message).toBe("bad input");
  expect(e.content.sibling).toEqual([]);
});

test("a PlggError folds exhaustively through match by tag", () => {
  const render = (e: PlggError): string =>
    match(e)(
      [
        invalidError$(),
        (x): string =>
          `invalid: ${x.content.message} (${x.content.sibling.length})`,
      ],
      [
        defect$(),
        (x): string =>
          `defect: ${x.content.message}`,
      ],
      [
        serializeError$(),
        (x): string =>
          `serialize: ${x.content.message}`,
      ],
      [
        deserializeError$(),
        (x): string =>
          `deserialize: ${x.content.message}`,
      ],
    );

  expect(
    render(invalidError({ message: "bad" })),
  ).equal("invalid: bad (0)");
  expect(render(defect("boom"))).equal(
    "defect: boom",
  );
  expect(
    render(serializeError({ message: "ser" })),
  ).equal("serialize: ser");
  expect(
    render(deserializeError({ message: "des" })),
  ).equal("deserialize: des");
});

test("a plgg error is plain tagged data, not an Error", () => {
  const e = invalidError({ message: "bad" });
  expect(e).not.toBeInstanceOf(Error);
  const json = JSON.parse(JSON.stringify(e));
  expect(json.__tag).toBe("InvalidError");
  expect(json.content.message).toBe("bad");
});

test("printPlggError terminates on a sibling cycle", () => {
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  // box() does not freeze content, so a self-referential sibling cycle is
  // constructible: a -> b -> a.
  const aSiblings: Array<InvalidError> = [];
  const a = invalidError({
    message: "a",
    sibling: aSiblings,
  });
  const b = invalidError({
    message: "b",
    sibling: [a],
  });
  aSiblings.push(b);
  // must not infinite-loop / RangeError
  printPlggError(a);
  expect(spy).toHaveBeenCalledWith(
    expect.stringContaining("<cycle>"),
  );
  spy.mockRestore();
});
