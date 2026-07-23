import {
  test,
  check,
  all,
  toEqual,
  toContain,
  toHaveLength,
  okThen,
  errThen,
  shouldBeErr,
} from "plgg-test";
import {
  Result,
  InvalidError,
  Num,
  SoftStr,
  cast,
  asObj,
  forProp,
  asNum,
  asSoftStr,
} from "plgg";
import {
  decodeRows,
  decodeRow,
} from "plgg-sql/index";

type User = { id: Num; name: SoftStr };

const asUser = (
  row: unknown,
): Result<User, InvalidError> =>
  cast(
    row,
    asObj,
    forProp("id", asNum),
    forProp("name", asSoftStr),
  );

test("decodes every well-formed row into a typed record", () =>
  check(
    decodeRows(asUser)([
      { id: 1, name: "Ada" },
      { id: 2, name: "Linus" },
    ]),
    okThen((rows) =>
      toEqual([
        { id: 1, name: "Ada" },
        { id: 2, name: "Linus" },
      ])(rows),
    ),
  ));

test("an empty row set decodes to an empty array", () =>
  check(
    decodeRows(asUser)([]),
    okThen((rows) => toEqual([])(rows)),
  ));

test("a single shape mismatch is an InvalidError, not a throw", () =>
  check(
    decodeRows(asUser)([
      { id: 1, name: "Ada" },
      { id: "two", name: "Linus" },
    ]),
    errThen((e) =>
      all([
        check(e.__tag, toEqual("InvalidError")),
        check(
          e.content.message,
          toContain("1 of 2"),
        ),
        check(e.content.sibling, toHaveLength(1)),
      ]),
    ),
  ));

test("every failing row is gathered as a sibling error", () =>
  check(
    decodeRows(asUser)([
      { id: "x", name: "Ada" },
      { id: 2, name: 99 },
    ]),
    errThen((e) =>
      all([
        check(
          e.content.message,
          toContain("2 of 2"),
        ),
        check(e.content.sibling, toHaveLength(2)),
      ]),
    ),
  ));

test("decodeRow decodes the first row of a result set", () =>
  check(
    decodeRow(asUser)([
      { id: 1, name: "Ada" },
      { id: 2, name: "Linus" },
    ]),
    okThen((row) =>
      toEqual({ id: 1, name: "Ada" })(row),
    ),
  ));

test("decodeRow errors on an empty result set", () =>
  check(
    decodeRow(asUser)([]),
    errThen((e) =>
      toContain("empty")(e.content.message),
    ),
  ));

test("decodeRow surfaces a malformed first row as an error", () =>
  check(
    decodeRow(asUser)([
      { id: "nope", name: "Ada" },
    ]),
    shouldBeErr(),
  ));
