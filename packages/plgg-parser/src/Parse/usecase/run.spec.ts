import {
  test,
  check,
  all,
  okThen,
  errThen,
  shouldBeErr,
  toBe,
  toContain,
} from "plgg-test";
import {
  literal,
  eof,
} from "plgg-parser/Parse/usecase/primitive";
import { left } from "plgg-parser/Parse/usecase/sequence";
import { run } from "plgg-parser/Parse/usecase/run";

test("run yields the parsed value on success", () =>
  check(
    run(literal("ok"), "ok!", 0),
    okThen(toBe("ok")),
  ));

test("run yields an InvalidError on failure (never throws)", () =>
  check(
    run(literal("ok"), "no", 0),
    errThen((e) =>
      check(
        e.content.message,
        toContain("expected"),
      ),
    ),
  ));

test("run does not require full consumption unless composed with eof", () =>
  all([
    // partial match is fine for bare run
    check(
      run(literal("ab"), "abc", 0),
      okThen(toBe("ab")),
    ),
    // left(_, eof) requires the whole input
    check(
      run(left(literal("ab"), eof), "abc", 0),
      shouldBeErr(),
    ),
    check(
      run(left(literal("ab"), eof), "ab", 0),
      okThen(toBe("ab")),
    ),
  ]));
