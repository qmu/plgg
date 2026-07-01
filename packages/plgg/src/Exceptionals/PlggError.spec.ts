import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  toHaveLength,
  not,
  toBeInstanceOf,
  errThen,
  someThen,
  vi,
} from "plgg-test";
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
  ok,
  err,
  printPlggError,
  isPlggError,
  plggErrorMessage,
  matchPlggError,
  resultErrorMessage,
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
  tryCatch,
  isErr,
} from "plgg/index";

test("isPlggError recognizes every core error variant", () =>
  all([
    check(
      isPlggError(invalidError({ message: "x" })),
      toBe(true),
    ),
    check(
      isPlggError(
        serializeError({ message: "x" }),
      ),
      toBe(true),
    ),
    check(
      isPlggError(
        deserializeError({ message: "x" }),
      ),
      toBe(true),
    ),
    check(isPlggError(defect("x")), toBe(true)),
  ]));

test("isPlggError rejects non-plgg values", () =>
  all([
    check(
      isPlggError(new Error("x")),
      toBe(false),
    ),
    check(isPlggError({}), toBe(false)),
    check(isPlggError(null), toBe(false)),
    check(isPlggError(undefined), toBe(false)),
    check(isPlggError("string"), toBe(false)),
    check(isPlggError(123), toBe(false)),
    check(isPlggError([]), toBe(false)),
    // a Box with a non-core tag is not a PlggError
    check(
      isPlggError(box("Other")({})),
      toBe(false),
    ),
    // a tag-colliding box without a string message is rejected (shape guard)
    check(
      isPlggError(
        box("InvalidError")({ totally: "wrong" }),
      ),
      toBe(false),
    ),
    check(
      isPlggError(box("Defect")({})),
      toBe(false),
    ),
  ]));

test("cast captures an unexpected step throw as a serializable cause", () => {
  const boom = (
    _v: unknown,
  ): Result<number, InvalidError> => {
    throw new Error("kaboom");
  };
  const result = cast(1, boom);
  return check(
    result,
    errThen((e) =>
      all([
        check(e.__tag, toBe("InvalidError")),
        check(
          e.content.message,
          toContain("kaboom"),
        ),
        // the origin is retained as a serializable cause, not flattened away
        check(
          isSome(e.content.cause),
          toBe(true),
        ),
      ]),
    ),
  );
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
  const result = all([
    check(
      spy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("[InvalidError]"),
      ),
      toBe(true),
    ),
    check(
      spy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("Test validation error"),
      ),
      toBe(true),
    ),
  ]);
  spy.mockRestore();
  return result;
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
  const result = all([
    check(spy.mock.calls.length, toBe(2)),
    check(
      spy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("Parent error"),
      ),
      toBe(true),
    ),
    check(
      spy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("Child error"),
      ),
      toBe(true),
    ),
  ]);
  spy.mockRestore();
  return result;
});

test("printPlggError unwraps a Defect's Error cause", () => {
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  printPlggError(
    defect("wrapped", new Error("root cause")),
  );
  const result = all([
    check(spy.mock.calls.length, toBe(2)),
    check(
      spy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("wrapped"),
      ),
      toBe(true),
    ),
    check(
      spy.mock.calls.some(
        (c) =>
          typeof c[0] === "string" &&
          c[0].includes("root cause"),
      ),
      toBe(true),
    ),
  ]);
  spy.mockRestore();
  return result;
});

test("toError returns the same instance for Error input", () => {
  const original = new Error("hi");
  return check(toError(original), toBe(original));
});

test("toError synthesizes for tagged data and primitives", () =>
  all([
    check(
      toError(invalidError({ message: "bad" }))
        .message,
      toContain("InvalidError"),
    ),
    check(toError("oops").message, toBe("oops")),
    check(toError(42).message, toBe("42")),
    check(toError(null).message, toBe("null")),
  ]));

test("panic throws the extracted Error", () =>
  check(
    isErr(
      tryCatch(
        () =>
          panic(
            invalidError({ message: "boom" }),
          ),
        (e) => e,
      )(undefined),
    ),
    toBe(true),
  ));

test("unreachable always throws", () =>
  check(
    isErr(
      tryCatch(
        () => unreachable(),
        (e) => e,
      )(undefined),
    ),
    toBe(true),
  ));

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
  return check(
    result,
    errThen((e) =>
      all([
        check(e.__tag, toBe("InvalidError")),
        check(e.content.sibling, toHaveLength(2)),
      ]),
    ),
  );
});

test("a plgg error satisfies isBox and exposes its tag and structured content", () => {
  const e = invalidError({
    message: "bad input",
  });
  return all([
    check(isBox(e), toBe(true)),
    check(e.__tag, toBe("InvalidError")),
    check(e.content.message, toBe("bad input")),
    check(e.content.sibling, toEqual([])),
  ]);
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

  return all([
    check(
      render(invalidError({ message: "bad" })),
      toBe("invalid: bad (0)"),
    ),
    check(
      render(defect("boom")),
      toBe("defect: boom"),
    ),
    check(
      render(serializeError({ message: "ser" })),
      toBe("serialize: ser"),
    ),
    check(
      render(
        deserializeError({ message: "des" }),
      ),
      toBe("deserialize: des"),
    ),
  ]);
});

test("a plgg error is plain tagged data, not an Error", () => {
  const e = invalidError({ message: "bad" });
  const json = JSON.parse(JSON.stringify(e));
  return all([
    check(e, not(toBeInstanceOf(Error))),
    check(json.__tag, toBe("InvalidError")),
    check(json.content.message, toBe("bad")),
  ]);
});

test("plggErrorMessage reads any variant's message", () =>
  all([
    check(
      plggErrorMessage(
        invalidError({ message: "a" }),
      ),
      toBe("a"),
    ),
    check(
      plggErrorMessage(defect("b")),
      toBe("b"),
    ),
  ]));

test("matchPlggError folds by variant via the $-matchers", () => {
  const label = matchPlggError({
    invalid: (): string => "invalid",
    serialize: (): string => "serialize",
    deserialize: (): string => "deserialize",
    defect: (): string => "defect",
  });
  return all([
    check(
      label(invalidError({ message: "x" })),
      toBe("invalid"),
    ),
    check(
      label(serializeError({ message: "x" })),
      toBe("serialize"),
    ),
    check(
      label(deserializeError({ message: "x" })),
      toBe("deserialize"),
    ),
    check(label(defect("x")), toBe("defect")),
  ]);
});

test("resultErrorMessage folds a Result's error message", () => {
  const failed = resultErrorMessage(
    err(invalidError({ message: "boom" })),
  );
  return all([
    check(failed, someThen(toBe("boom"))),
    check(
      isSome(resultErrorMessage(ok(1))),
      toBe(false),
    ),
  ]);
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
  const result = check(
    spy.mock.calls.some(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes("<cycle>"),
    ),
    toBe(true),
  );
  spy.mockRestore();
  return result;
});
