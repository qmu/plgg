import { test, expect } from "vitest";
import { some, none } from "plgg";
import {
  sql,
  isSql,
  Interpolation,
} from "plgg-sql/index";

test("a template with no interpolation is trusted text with no params", () => {
  expect(sql`SELECT 1`.content).toEqual({
    text: "SELECT 1",
    params: [],
  });
});

test("an interpolated value binds as a ? placeholder, lifted into Some", () => {
  const id = 7;
  expect(
    sql`SELECT * FROM users WHERE id = ${id}`
      .content,
  ).toEqual({
    text: "SELECT * FROM users WHERE id = ?",
    params: [some(7)],
  });
});

test("multiple interpolations bind left-to-right", () => {
  expect(
    sql`SELECT * FROM users WHERE active = ${true} AND age > ${18}`
      .content,
  ).toEqual({
    text: "SELECT * FROM users WHERE active = ? AND age > ?",
    params: [some(true), some(18)],
  });
});

test("string, number and boolean all bind as Some parameters", () => {
  expect(
    sql`INSERT INTO t VALUES (${"Ada"}, ${42}, ${false})`
      .content,
  ).toEqual({
    text: "INSERT INTO t VALUES (?, ?, ?)",
    params: [some("Ada"), some(42), some(false)],
  });
});

test("an Option value binds through; None is SQL NULL (no raw null)", () => {
  expect(
    sql`UPDATE users SET name = ${some("Ada")}, deleted_at = ${none()} WHERE id = ${1}`
      .content,
  ).toEqual({
    text: "UPDATE users SET name = ?, deleted_at = ? WHERE id = ?",
    params: [some("Ada"), none(), some(1)],
  });
});

test("an interpolated Sql fragment is spliced, not bound", () => {
  const predicate = sql`age > ${18}`;
  const query = sql`SELECT * FROM users WHERE ${predicate}`;
  expect(query.content).toEqual({
    text: "SELECT * FROM users WHERE age > ?",
    params: [some(18)],
  });
});

test("splicing merges text and params across fragments in order", () => {
  const active = sql`active = ${true}`;
  const adult = sql`age >= ${18}`;
  const query = sql`SELECT id FROM users WHERE ${active} AND ${adult} ORDER BY id`;
  expect(query.content).toEqual({
    text: "SELECT id FROM users WHERE active = ? AND age >= ? ORDER BY id",
    params: [some(true), some(18)],
  });
});

test("isSql distinguishes fragments from plain values", () => {
  expect(isSql(sql`SELECT 1`)).toBe(true);
  expect(isSql(7)).toBe(false);
  expect(isSql("SELECT 1")).toBe(false);
  expect(isSql(some(1))).toBe(false);
  expect(
    isSql({ __tag: "Other", content: {} }),
  ).toBe(false);
});

test("a forged Sql-shaped object is rejected (symbol brand, not just the tag)", () => {
  // exactly the structural shape of an Sql box, e.g. parsed from attacker JSON
  const forged = {
    __tag: "Sql",
    content: { text: "1 OR 1=1; --", params: [] },
  };
  expect(isSql(forged)).toBe(false);
  // reaching the builder as an untyped value, it is bound — never spliced
  const { text } = sql`SELECT ${
    forged as unknown as Interpolation
  }`.content;
  expect(text).toBe("SELECT ?");
  expect(text).not.toContain("OR 1=1");
});

test("placeholder count always equals param count, including a nullish hole", () => {
  // a type hole passes null/undefined; it must bind as one NULL placeholder,
  // never desync text and params
  const hole = null as unknown as number;
  const { text, params } =
    sql`a = ${hole} AND b = ${5}`.content;
  const placeholders = text.split("?").length - 1;
  expect(placeholders).toBe(params.length);
  expect(text).toBe("a = ? AND b = ?");
  expect(params).toEqual([none(), some(5)]);
});

test("a malicious value never reaches the SQL text (injection safety)", () => {
  const name = "x'; DROP TABLE users; --";
  const { text, params } =
    sql`SELECT * FROM users WHERE name = ${name}`
      .content;
  expect(text).toBe(
    "SELECT * FROM users WHERE name = ?",
  );
  expect(text).not.toContain("DROP TABLE");
  expect(params).toEqual([some(name)]);
});
