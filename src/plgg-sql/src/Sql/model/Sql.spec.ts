import { test, expect } from "vitest";
import { sql, isSql } from "plgg-sql/index";

test("a template with no interpolation is trusted text with no params", () => {
  expect(sql`SELECT 1`.content).toEqual({
    text: "SELECT 1",
    params: [],
  });
});

test("an interpolated value becomes a ? placeholder bound in params", () => {
  const id = 7;
  expect(
    sql`SELECT * FROM users WHERE id = ${id}`.content,
  ).toEqual({
    text: "SELECT * FROM users WHERE id = ?",
    params: [7],
  });
});

test("multiple interpolations bind left-to-right", () => {
  expect(
    sql`SELECT * FROM users WHERE active = ${true} AND age > ${18}`
      .content,
  ).toEqual({
    text: "SELECT * FROM users WHERE active = ? AND age > ?",
    params: [true, 18],
  });
});

test("string, number, boolean and null all bind as parameters", () => {
  expect(
    sql`INSERT INTO t VALUES (${"Ada"}, ${42}, ${false}, ${null})`
      .content,
  ).toEqual({
    text: "INSERT INTO t VALUES (?, ?, ?, ?)",
    params: ["Ada", 42, false, null],
  });
});

test("an interpolated Sql fragment is spliced, not bound", () => {
  const predicate = sql`age > ${18}`;
  const query = sql`SELECT * FROM users WHERE ${predicate}`;
  expect(query.content).toEqual({
    text: "SELECT * FROM users WHERE age > ?",
    params: [18],
  });
});

test("splicing merges text and params across fragments in order", () => {
  const active = sql`active = ${true}`;
  const adult = sql`age >= ${18}`;
  const query = sql`SELECT id FROM users WHERE ${active} AND ${adult} ORDER BY id`;
  expect(query.content).toEqual({
    text: "SELECT id FROM users WHERE active = ? AND age >= ? ORDER BY id",
    params: [true, 18],
  });
});

test("isSql distinguishes fragments from plain values", () => {
  expect(isSql(sql`SELECT 1`)).toBe(true);
  expect(isSql(7)).toBe(false);
  expect(isSql("SELECT 1")).toBe(false);
  expect(isSql(null)).toBe(false);
  expect(isSql({ __tag: "Other", content: {} })).toBe(false);
});

test("a malicious value never reaches the SQL text (injection safety)", () => {
  const name = "x'; DROP TABLE users; --";
  const { text, params } = sql`SELECT * FROM users WHERE name = ${name}`
    .content;
  expect(text).toBe("SELECT * FROM users WHERE name = ?");
  expect(text).not.toContain("DROP TABLE");
  expect(params).toEqual([name]);
});
