import {
  test,
  check,
  all,
  okThen,
  shouldBeErr,
  toBe,
} from "plgg-test";
import { SoftStr } from "plgg";
import { initState } from "plgg-parser/Parse/model/ParseState";
import {
  char,
  digit,
} from "plgg-parser/Parse/usecase/primitive";
import {
  lookahead,
  notFollowedBy,
} from "plgg-parser/Parse/usecase/lookahead";
import { left } from "plgg-parser/Parse/usecase/sequence";

/** Seed state over `src` with a trivial userState. */
const from = (src: SoftStr) => initState(src, 0);

test("lookahead reads a value without consuming input", () =>
  check(
    lookahead(digit)(from("7x")),
    okThen((p) =>
      all([
        check(p.value, toBe("7")),
        check(p.state.position, toBe(0)),
      ]),
    ),
  ));

test("lookahead propagates the inner failure", () =>
  check(
    lookahead(digit)(from("x")),
    shouldBeErr(),
  ));

test("notFollowedBy succeeds exactly when its parser fails", () =>
  all([
    check(
      notFollowedBy(digit)(from("x")),
      okThen((p) =>
        all([
          check(p.value, toBe(true)),
          check(p.state.position, toBe(0)),
        ]),
      ),
    ),
    check(
      notFollowedBy(digit)(from("7")),
      shouldBeErr(),
    ),
  ]));

test("notFollowedBy composes as a boundary guard", () =>
  check(
    left(
      char("a"),
      notFollowedBy(digit),
    )(from("ab")),
    okThen((p) => check(p.value, toBe("a"))),
  ));
