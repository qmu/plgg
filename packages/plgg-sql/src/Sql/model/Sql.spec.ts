import {
  test,
  check,
  all,
  toBe,
  toEqual,
  not,
  toContain,
} from "plgg-test";
import { some, none, isOk } from "plgg";
import {
  sql,
  isSql,
  identSql,
  asSqlIdent,
  Interpolation,
} from "plgg-sql/index";

test("a template with no interpolation is trusted text with no params", () =>
  check(
    sql`SELECT 1`.content,
    toEqual({
      text: "SELECT 1",
      params: [],
    }),
  ));

test("an interpolated value binds as a ? placeholder, lifted into Some", () => {
  const id = 7;
  return check(
    sql`SELECT * FROM users WHERE id = ${id}`
      .content,
    toEqual({
      text: "SELECT * FROM users WHERE id = ?",
      params: [some(7)],
    }),
  );
});

test("multiple interpolations bind left-to-right", () =>
  check(
    sql`SELECT * FROM users WHERE active = ${true} AND age > ${18}`
      .content,
    toEqual({
      text: "SELECT * FROM users WHERE active = ? AND age > ?",
      params: [some(true), some(18)],
    }),
  ));

test("string, number and boolean all bind as Some parameters", () =>
  check(
    sql`INSERT INTO t VALUES (${"Ada"}, ${42}, ${false})`
      .content,
    toEqual({
      text: "INSERT INTO t VALUES (?, ?, ?)",
      params: [
        some("Ada"),
        some(42),
        some(false),
      ],
    }),
  ));

test("an Option value binds through; None is SQL NULL (no raw null)", () =>
  check(
    sql`UPDATE users SET name = ${some("Ada")}, deleted_at = ${none()} WHERE id = ${1}`
      .content,
    toEqual({
      text: "UPDATE users SET name = ?, deleted_at = ? WHERE id = ?",
      params: [some("Ada"), none(), some(1)],
    }),
  ));

test("an interpolated Sql fragment is spliced, not bound", () => {
  const predicate = sql`age > ${18}`;
  const query = sql`SELECT * FROM users WHERE ${predicate}`;
  return check(
    query.content,
    toEqual({
      text: "SELECT * FROM users WHERE age > ?",
      params: [some(18)],
    }),
  );
});

test("splicing merges text and params across fragments in order", () => {
  const active = sql`active = ${true}`;
  const adult = sql`age >= ${18}`;
  const query = sql`SELECT id FROM users WHERE ${active} AND ${adult} ORDER BY id`;
  return check(
    query.content,
    toEqual({
      text: "SELECT id FROM users WHERE active = ? AND age >= ? ORDER BY id",
      params: [some(true), some(18)],
    }),
  );
});

test("isSql distinguishes fragments from plain values", () =>
  all([
    check(isSql(sql`SELECT 1`), toBe(true)),
    check(isSql(7), toBe(false)),
    check(isSql("SELECT 1"), toBe(false)),
    check(isSql(some(1)), toBe(false)),
    check(
      isSql({ __tag: "Other", content: {} }),
      toBe(false),
    ),
  ]));

test("a forged Sql-shaped object is rejected (symbol brand, not just the tag)", () => {
  // exactly the structural shape of an Sql box, e.g. parsed from attacker JSON
  const forged = {
    __tag: "Sql",
    content: { text: "1 OR 1=1; --", params: [] },
  };
  // Reaching the builder as an untyped value, it is bound — never spliced.
  // The forged object is deliberately ill-typed for an interpolation slot
  // (it is NOT an `Sql`/`SqlValue`/`SqlParam`): the cast simulates a value
  // that bypassed the compiler (attacker JSON), which is the SUBJECT of
  // this safety test — `isSql` already takes `unknown`, so its check needs
  // no cast.
  const asInterpolation = (
    v: unknown,
  ): Interpolation => v as Interpolation;
  const { text } = sql`SELECT ${asInterpolation(
    forged,
  )}`.content;
  return all([
    check(isSql(forged), toBe(false)),
    check(text, toBe("SELECT ?")),
    check(text, not(toContain("OR 1=1"))),
  ]);
});

test("placeholder count always equals param count, including a nullish hole", () => {
  // a type hole passes null/undefined; it must bind as one NULL placeholder,
  // never desync text and params. The cast simulates a `null` that bypassed
  // the compiler reaching an interpolation slot — the SUBJECT of this test.
  const asInterpolation = (
    v: unknown,
  ): Interpolation => v as Interpolation;
  const { text, params } =
    sql`a = ${asInterpolation(null)} AND b = ${5}`
      .content;
  const placeholders = text.split("?").length - 1;
  return all([
    check(placeholders, toBe(params.length)),
    check(text, toBe("a = ? AND b = ?")),
    check(params, toEqual([none(), some(5)])),
  ]);
});

test("a malicious value never reaches the SQL text (injection safety)", () => {
  const name = "x'; DROP TABLE users; --";
  const { text, params } =
    sql`SELECT * FROM users WHERE name = ${name}`
      .content;
  return all([
    check(
      text,
      toBe("SELECT * FROM users WHERE name = ?"),
    ),
    check(text, not(toContain("DROP TABLE"))),
    check(params, toEqual([some(name)])),
  ]);
});

test("identSql splices a validated identifier as a param-free fragment", () => {
  const r = asSqlIdent("user_docs");
  if (!isOk(r)) {
    return check(false, toBe(true));
  }
  const frag = identSql(r.content);
  const q = sql`SELECT id FROM ${frag} WHERE n = ${1} AND m = ${2}`;
  return all([
    // the identifier contributes text but ZERO params
    check(frag.content.text, toBe("user_docs")),
    check(frag.content.params.length, toBe(0)),
    check(
      q.content.text,
      toBe(
        "SELECT id FROM user_docs WHERE n = ? AND m = ?",
      ),
    ),
    check(q.content.params, toEqual([some(1), some(2)])),
    // the placeholder-count invariant holds under the mixed
    // splice (one ident splice, two value binds)
    check(
      q.content.text.split("?").length - 1,
      toBe(q.content.params.length),
    ),
  ]);
});
