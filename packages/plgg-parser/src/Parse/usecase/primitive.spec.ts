import {
  test,
  check,
  all,
  okThen,
  errThen,
  toBe,
  toContain,
} from "plgg-test";
import { SoftStr } from "plgg";
import { initState } from "plgg-parser/Parse/model/ParseState";
import {
  satisfy,
  anyChar,
  eof,
  succeed,
  fail,
  literal,
  char,
  oneOf,
  noneOf,
  digit,
  letter,
  alphaNum,
  whitespace,
} from "plgg-parser/Parse/usecase/primitive";
import { run } from "plgg-parser/Parse/usecase/run";

/** Seed state over `src` with a trivial (unread) userState. */
const from = (src: SoftStr) => initState(src, 0);

test("satisfy consumes a matching char and advances", () =>
  check(
    satisfy(
      "x",
      (c: SoftStr) => c === "x",
    )(from("xy")),
    okThen((p) =>
      all([
        check(p.value, toBe("x")),
        check(p.state.position, toBe(1)),
      ]),
    ),
  ));

test("satisfy fails on a non-matching char", () =>
  check(
    satisfy(
      "x",
      (c: SoftStr) => c === "x",
    )(from("yy")),
    errThen((e) =>
      check(
        e.content.message,
        toContain("found"),
      ),
    ),
  ));

test("satisfy fails at end of input", () =>
  check(
    satisfy(
      "x",
      (c: SoftStr) => c === "x",
    )(from("")),
    errThen((e) =>
      check(
        e.content.message,
        toContain("end of input"),
      ),
    ),
  ));

test("anyChar consumes any single char", () =>
  all([
    check(
      run(anyChar, "!", 0),
      okThen(toBe("!")),
    ),
    check(
      run(anyChar, "", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("end of input"),
        ),
      ),
    ),
  ]));

test("eof succeeds only at the end", () =>
  all([
    check(
      eof(from("")),
      okThen((p) => check(p.value, toBe(true))),
    ),
    check(
      eof(from("a")),
      errThen((e) =>
        check(
          e.content.message,
          toContain("end of input"),
        ),
      ),
    ),
  ]));

test("succeed always yields its value, consuming nothing", () =>
  check(
    succeed(42)(from("abc")),
    okThen((p) =>
      all([
        check(p.value, toBe(42)),
        check(p.state.position, toBe(0)),
      ]),
    ),
  ));

test("fail always fails with its message", () =>
  check(
    fail("nope")(from("abc")),
    errThen((e) =>
      check(e.content.message, toContain("nope")),
    ),
  ));

test("literal matches an exact string", () =>
  all([
    check(
      run(literal("const"), "const x", 0),
      okThen(toBe("const")),
    ),
    check(
      run(literal("const"), "cons", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("expected"),
        ),
      ),
    ),
  ]));

test("char matches one specific character", () =>
  all([
    check(
      run(char("("), "()", 0),
      okThen(toBe("(")),
    ),
    check(
      run(char("("), "x", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("found"),
        ),
      ),
    ),
  ]));

test("oneOf / noneOf select by membership", () =>
  all([
    check(
      run(oneOf("+-"), "-1", 0),
      okThen(toBe("-")),
    ),
    check(
      run(oneOf("+-"), "*", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("one of"),
        ),
      ),
    ),
    check(
      run(noneOf('"'), "a", 0),
      okThen(toBe("a")),
    ),
    check(
      run(noneOf('"'), '"', 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("none of"),
        ),
      ),
    ),
  ]));

test("character classes classify by range", () =>
  all([
    check(run(digit, "7", 0), okThen(toBe("7"))),
    check(
      run(digit, "a", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("digit"),
        ),
      ),
    ),
    check(run(letter, "Q", 0), okThen(toBe("Q"))),
    check(
      run(letter, "1", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("letter"),
        ),
      ),
    ),
    check(
      run(alphaNum, "z", 0),
      okThen(toBe("z")),
    ),
    check(
      run(alphaNum, "3", 0),
      okThen(toBe("3")),
    ),
    check(
      run(alphaNum, "-", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("letter or digit"),
        ),
      ),
    ),
    check(
      run(whitespace, " ", 0),
      okThen(toBe(" ")),
    ),
    check(
      run(whitespace, "\n", 0),
      okThen(toBe("\n")),
    ),
    check(
      run(whitespace, "x", 0),
      errThen((e) =>
        check(
          e.content.message,
          toContain("whitespace"),
        ),
      ),
    ),
  ]));
