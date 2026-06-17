import { test, expect } from "vitest";
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
  isOk,
  isErr,
} from "plgg";
import { decodeRows, decodeRow } from "plgg-sql/index";

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

test("decodes every well-formed row into a typed record", () => {
  const result = decodeRows(asUser)([
    { id: 1, name: "Ada" },
    { id: 2, name: "Linus" },
  ]);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual([
      { id: 1, name: "Ada" },
      { id: 2, name: "Linus" },
    ]);
  }
});

test("an empty row set decodes to an empty array", () => {
  const result = decodeRows(asUser)([]);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual([]);
  }
});

test("a single shape mismatch is an InvalidError, not a throw", () => {
  const result = decodeRows(asUser)([
    { id: 1, name: "Ada" },
    { id: "two", name: "Linus" },
  ]);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.__tag).toBe("InvalidError");
    expect(result.content.content.message).toContain(
      "1 of 2",
    );
    expect(
      result.content.content.sibling,
    ).toHaveLength(1);
  }
});

test("every failing row is gathered as a sibling error", () => {
  const result = decodeRows(asUser)([
    { id: "x", name: "Ada" },
    { id: 2, name: 99 },
  ]);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.content.message).toContain(
      "2 of 2",
    );
    expect(
      result.content.content.sibling,
    ).toHaveLength(2);
  }
});

test("decodeRow decodes the first row of a result set", () => {
  const result = decodeRow(asUser)([
    { id: 1, name: "Ada" },
    { id: 2, name: "Linus" },
  ]);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual({ id: 1, name: "Ada" });
  }
});

test("decodeRow errors on an empty result set", () => {
  const result = decodeRow(asUser)([]);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.content.message).toContain(
      "empty",
    );
  }
});

test("decodeRow surfaces a malformed first row as an error", () => {
  const result = decodeRow(asUser)([{ id: "nope", name: "Ada" }]);
  expect(isErr(result)).toBe(true);
});
