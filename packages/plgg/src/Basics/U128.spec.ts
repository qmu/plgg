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
  asU128,
  isU128,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isU128 true for a valid U128 box", () =>
  check(
    isU128(box("U128")(1000n)),
    toBe(true),
  ));

test("isU128 false for boxes with other tags", () =>
  all([
    check(
      isU128(box("U64")(1n)),
      toBe(false),
    ),
    check(isU128(1n), toBe(false)),
    check(isU128(null), toBe(false)),
    check(isU128({}), toBe(false)),
  ]));

test("asU128 accepts an already-boxed U128", () => {
  const existing = box("U128")(42n);
  return check(
    asU128(existing),
    okThen(toBe(existing)),
  );
});

test("asU128 lifts a raw bigint in range", () =>
  check(
    asU128(10000000000n),
    okThen((v) =>
      all([
        toBe("U128")(v.__tag),
        toBe(10000000000n)(v.content),
      ]),
    ),
  ));

test("asU128 lifts the zero boundary", () =>
  check(isOk(asU128(0n)), toBe(true)));

test("asU128 lifts the max U128 value", () => {
  const max =
    340282366920938463463374607431768211455n;
  return check(
    asU128(max),
    okThen((v) => toBe(max)(v.content)),
  );
});

test("asU128 fails for bigint above range", () => {
  const outOfRange =
    340282366920938463463374607431768211456n;
  return check(
    asU128(outOfRange),
    errThen((e) =>
      toContain("Value is not a U128")(
        e.content.message,
      ),
    ),
  );
});

test("asU128 fails for negative bigint", () =>
  check(isErr(asU128(-1n)), toBe(true)));

test("asU128 fails for non-bigint values", () =>
  all([
    check(isErr(asU128(42)), toBe(true)),
    check(isErr(asU128("42")), toBe(true)),
    check(isErr(asU128(null)), toBe(true)),
    check(
      isErr(asU128(undefined)),
      toBe(true),
    ),
  ]));
