import assert from "node:assert/strict";
import { test } from "node:test";
import { isErr, isOk } from "plgg";
import {
  eof,
  left,
  literal,
  run,
} from "plgg-parser";
import type { Parser } from "plgg-parser";

const parser: Parser<string, number> = left(
  literal("ok"),
  eof,
);

test("public root exports compose and parse a complete input", () => {
  const result = run(parser, "ok", 0);
  assert.ok(isOk(result));
  const value: string = result.content;
  assert.equal(value, "ok");
});

test("mismatch, trailing input and EOF return typed errors", () => {
  for (const source of ["no", "ok!", ""]) {
    const result = run(parser, source, 0);
    assert.ok(isErr(result));
    assert.match(
      result.content.content.message,
      /expected/,
    );
  }
});

test("bare run preserves partial-consumption behavior", () => {
  const result = run(literal("ok"), "ok!", 0);
  assert.ok(isOk(result));
  assert.equal(result.content, "ok");
});
