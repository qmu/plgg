import {
  test,
  check,
  all,
  toBe,
  toBeInstanceOf,
} from "plgg-test";
import {
  Defect,
  InvalidError,
  defect,
  defect$,
  invalidError$,
  toError,
  panic,
  match,
  isSome,
  tryCatch,
  isErr,
} from "plgg/index";

test("defect builds a Defect box, cause absent", () => {
  const d = defect("boom");
  return all([
    check(d.__tag, toBe("Defect")),
    check(d.content.message, toBe("boom")),
    check(isSome(d.content.cause), toBe(false)),
  ]);
});

test("defect carries an Error cause as Some", () => {
  const d = defect("wrapped", new Error("orig"));
  return check(
    isSome(d.content.cause),
    toBe(true),
  );
});

test("toError carries a Defect's cause message", () =>
  check(
    toError(defect("wrapped", new Error("orig")))
      .message,
    toBe("orig"),
  ));

test("a Defect's cause survives JSON serialization", () => {
  const d = defect("boom", new Error("orig"));
  const json = JSON.parse(JSON.stringify(d));
  // a raw Error would collapse to {}; the Cause snapshot keeps the detail.
  return all([
    check(
      json.content.cause.content.name,
      toBe("Error"),
    ),
    check(
      json.content.cause.content.message,
      toBe("orig"),
    ),
  ]);
});

test("toError synthesizes when no Error cause", () => {
  const err = toError(defect("nope"));
  return all([
    check(err, toBeInstanceOf(Error)),
    check(err.message, toBe("nope")),
  ]);
});

test("toError passes a real Error through", () => {
  const e = new Error("x");
  return check(toError(e), toBe(e));
});

test("toError stringifies a non-box value", () =>
  check(toError("plain").message, toBe("plain")));

test("panic throws the extracted Error", () => {
  const e = new Error("orig");
  return check(
    isErr(
      tryCatch(
        () => panic(defect("wrapped", e)),
        (err) => err,
      )(undefined),
    ),
    toBe(true),
  );
});

test("defect$ folds a Defect through match", () => {
  const fold = (
    e: Defect | InvalidError,
  ): string =>
    match(e)(
      [
        defect$(),
        (d): string =>
          `defect: ${d.content.message}`,
      ],
      [
        invalidError$(),
        (x): string =>
          `invalid: ${x.content.message}`,
      ],
    );
  return check(
    fold(defect("x")),
    toBe("defect: x"),
  );
});
