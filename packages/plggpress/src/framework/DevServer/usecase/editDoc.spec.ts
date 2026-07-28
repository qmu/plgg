import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { applyEdits } from "plggpress/framework/DevServer/usecase/editDoc";

test("applies a single find/replace", () =>
  check(
    applyEdits("hello world", [
      { find: "world", replace: "plgg" },
    ]),
    okThen((t) => toBe("hello plgg")(t)),
  ));

test("applies multiple edits, splicing at the start and keeping the tail", () =>
  check(
    applyEdits("a b c", [
      { find: "a", replace: "X" },
      { find: "c", replace: "Z" },
    ]),
    okThen((t) => toBe("X b Z")(t)),
  ));

test("applies an empty op list as a no-op", () =>
  check(
    applyEdits("unchanged", []),
    okThen((t) => toBe("unchanged")(t)),
  ));

test("rejects an empty find", () =>
  check(
    applyEdits("x", [{ find: "", replace: "y" }]),
    errThen((e) => toBe("EmptyFind")(e.kind)),
  ));

test("rejects an absent find", () =>
  check(
    applyEdits("x", [
      { find: "zzz", replace: "y" },
    ]),
    errThen((e) => toBe("FindAbsent")(e.kind)),
  ));

test("rejects an ambiguous find", () =>
  check(
    applyEdits("a a", [
      { find: "a", replace: "b" },
    ]),
    errThen((e) =>
      toBe("FindAmbiguous")(e.kind),
    ),
  ));

test("rejects overlapping edits", () =>
  check(
    applyEdits("abcdef", [
      { find: "abc", replace: "X" },
      { find: "bcd", replace: "Y" },
    ]),
    errThen((e) =>
      all([
        toBe("OverlappingEdits")(e.kind),
        toBe("bcd")(e.find),
      ]),
    ),
  ));
