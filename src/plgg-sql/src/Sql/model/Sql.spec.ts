import { test, expect } from "vitest";
import { some, none } from "plgg";
import { sql, isSql } from "plgg-sql/index";

test("a template with no interpolation is trusted text with no params", () => {
  expect(sql`SELECT 1`.content).toEqual({
    text: "SELECT 1",
    params: [],
  });
});

test("an interpolated value binds as a ? placeholder, lifted into Some", () => {
  const id = 7;
  expect(
    sql`SELECT * FROM users WHERE id = ${id}`.content,
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
  expect(isSql({ __tag: "Other", content: {} })).toBe(false);
});

test("a malicious value never reaches the SQL text (injection safety)", () => {
  const name = "x'; DROP TABLE users; --";
  const { text, params } = sql`SELECT * FROM users WHERE name = ${name}`
    .content;
  expect(text).toBe("SELECT * FROM users WHERE name = ?");
  expect(text).not.toContain("DROP TABLE");
  expect(params).toEqual([some(name)]);
});
