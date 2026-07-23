import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { none, some, isOk } from "plgg";
import { asSqlIdent } from "plgg-sql/Sql/model/SqlIdent";
import {
  fts5Table,
  fts5Column,
  normalContent,
  contentlessContent,
  externalContent,
  sqlIdentString,
} from "plgg-sql/index";

// A test identifier (asSqlIdent always succeeds for these).
const id = (s: string) => {
  const r = asSqlIdent(s);
  if (!isOk(r)) {
    throw new Error(`test ident invalid: ${s}`);
  }
  return r.content;
};

test("fts5Column defaults to indexed; the flag marks UNINDEXED", () =>
  all([
    check(fts5Column(id("body")).unindexed, toBe(false)),
    check(
      fts5Column(id("url"), true).unindexed,
      toBe(true),
    ),
    check(
      sqlIdentString(fts5Column(id("body")).name),
      toBe("body"),
    ),
  ]));

test("fts5Table requires at least one column", () =>
  all([
    check(
      fts5Table({
        name: id("docs"),
        columns: [fts5Column(id("body"))],
        content: normalContent(),
        tokenizer: none(),
      }),
      okThen((t) => toBe(1)(t.columns.length)),
    ),
    check(
      fts5Table({
        name: id("docs"),
        columns: [],
        content: normalContent(),
        tokenizer: none(),
      }),
      errThen((e) => toBe("InvalidError")(e.__tag)),
    ),
  ]));

test("the content sum tags each mode distinctly", () =>
  all([
    check(normalContent().__tag, toBe("Fts5Normal")),
    check(
      contentlessContent().__tag,
      toBe("Fts5Contentless"),
    ),
    check(
      externalContent(id("src"), id("id")).__tag,
      toBe("Fts5External"),
    ),
  ]));

test("externalContent carries the source table and rowid", () => {
  const c = externalContent(id("src"), id("row_id"));
  return c.__tag === "Fts5External"
    ? all([
        check(
          sqlIdentString(c.content.table),
          toBe("src"),
        ),
        check(
          sqlIdentString(c.content.rowid),
          toBe("row_id"),
        ),
      ])
    : check(false, toBe(true));
});

test("a tokenizer is optional (closed built-in union)", () =>
  all([
    check(
      fts5Table({
        name: id("docs"),
        columns: [fts5Column(id("body"))],
        content: contentlessContent(),
        tokenizer: some("trigram"),
      }),
      okThen((t) =>
        toBe("trigram")(
          t.tokenizer.__tag === "Some"
            ? t.tokenizer.content
            : "none",
        ),
      ),
    ),
  ]));
