import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { foldThrown } from "plgg/index";

test("foldThrown routes an Error to onError", () => {
  const r = foldThrown<string>(
    (e) => `err:${e.message}`,
    () => "other",
  )(new Error("boom"));
  return check(r, toBe("err:boom"));
});

test("foldThrown narrows the Error subtype", () => {
  const r = foldThrown<string>(
    (e) => e.name,
    () => "other",
  )(new TypeError("t"));
  return check(r, toBe("TypeError"));
});

test("foldThrown routes non-Error to onOther", () => {
  const r = foldThrown<string>(
    () => "err",
    (v) => `other:${String(v)}`,
  );
  return all([
    check(r("x"), toBe("other:x")),
    check(r(42), toBe("other:42")),
    check(r(null), toBe("other:null")),
    check(
      r(undefined),
      toBe("other:undefined"),
    ),
    check(
      r({ a: 1 }),
      toBe("other:[object Object]"),
    ),
  ]);
});
