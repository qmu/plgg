import { test, expect } from "vitest";
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
} from "plgg/index";

test("defect builds a Defect box, cause absent", () => {
  const d = defect("boom");
  expect(d.__tag).toBe("Defect");
  expect(d.content.message).toBe("boom");
  expect(isSome(d.content.cause)).toBe(false);
});

test("defect carries an Error cause as Some", () => {
  const d = defect("wrapped", new Error("orig"));
  expect(isSome(d.content.cause)).toBe(true);
});

test("toError unwraps a Defect's Error cause", () => {
  const e = new Error("orig");
  expect(toError(defect("wrapped", e))).toBe(e);
});

test("toError synthesizes when no Error cause", () => {
  const err = toError(defect("nope"));
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe("nope");
});

test("toError passes a real Error through", () => {
  const e = new Error("x");
  expect(toError(e)).toBe(e);
});

test("toError stringifies a non-box value", () => {
  expect(toError("plain").message).toBe("plain");
});

test("panic throws the extracted Error", () => {
  const e = new Error("orig");
  expect(() =>
    panic(defect("wrapped", e)),
  ).toThrow(e);
});

test("defect$ folds a Defect through match", () => {
  const fold = (
    e: Defect | InvalidError,
  ): string =>
    match(e)(
      [
        defect$(),
        (d): string => `defect: ${d.content.message}`,
      ],
      [
        invalidError$(),
        (x): string =>
          `invalid: ${x.content.message}`,
      ],
    );
  expect(fold(defect("x"))).toBe("defect: x");
});
