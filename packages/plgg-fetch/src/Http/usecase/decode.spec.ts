import { test, expect } from "vitest";
import {
  Obj,
  Result,
  InvalidError,
  SoftStr,
  isOk,
  isErr,
  cast,
  asObj,
  asSoftStr,
  forProp,
} from "plgg";
import {
  HttpResponse,
  statusOf,
  bytesBody,
} from "plgg-http";
import { decodeJsonBody } from "plgg-fetch/index";

type User = Obj<{ name: SoftStr }>;

const asUser = (
  value: unknown,
): Result<User, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("name", (x) => cast(x, asSoftStr)),
  );

const responseWith = (
  body: HttpResponse["body"],
): HttpResponse => ({
  status: statusOf(200),
  headers: {},
  body,
});

test("decodeJsonBody parses a JSON body into a typed value", () => {
  const result = decodeJsonBody(asUser)(
    responseWith('{"name":"Ada"}'),
  );
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.name).toBe("Ada");
  }
});

test("decodeJsonBody surfaces a JSON syntax error as InvalidError", () => {
  const result = decodeJsonBody(asUser)(
    responseWith("not json"),
  );
  expect(isErr(result)).toBe(true);
});

test("decodeJsonBody surfaces a shape mismatch as InvalidError", () => {
  const result = decodeJsonBody(asUser)(
    responseWith('{"name":123}'),
  );
  expect(isErr(result)).toBe(true);
});

test("decodeJsonBody rejects a non-text (bytes) body", () => {
  const result = decodeJsonBody(asUser)(
    responseWith(bytesBody(new Uint8Array([1, 2]))),
  );
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.content.message).toContain(
      "not text",
    );
  }
});
