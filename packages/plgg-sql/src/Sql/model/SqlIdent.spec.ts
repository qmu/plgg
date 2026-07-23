import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { isOk } from "plgg";
import {
  asSqlIdent,
  isSqlIdent,
  sqlIdentString,
} from "plgg-sql/Sql/model/SqlIdent";

test("accepts safe unquoted identifiers", () =>
  all([
    check(
      asSqlIdent("docs"),
      okThen((i) => toBe("docs")(sqlIdentString(i))),
    ),
    check(
      asSqlIdent("content_rowid"),
      okThen((i) =>
        toBe("content_rowid")(sqlIdentString(i)),
      ),
    ),
    check(
      asSqlIdent("_x9"),
      okThen((i) => toBe("_x9")(sqlIdentString(i))),
    ),
  ]));

test("rejects quotes, spaces, punctuation, leading digit, and empty", () =>
  all([
    check(
      asSqlIdent('"x"'),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
    check(
      asSqlIdent("a b"),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
    check(
      asSqlIdent("a;--"),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
    check(
      asSqlIdent(""),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
    check(
      asSqlIdent("1abc"),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
    check(
      asSqlIdent(42),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
  ]));

test("isSqlIdent guards a branded value, not a raw string", () => {
  const r = asSqlIdent("docs");
  return all([
    check(isOk(r), toBe(true)),
    check(
      isOk(r) ? isSqlIdent(r.content) : false,
      toBe(true),
    ),
    // a bare string carries no brand
    check(isSqlIdent("docs"), toBe(false)),
  ]);
});
