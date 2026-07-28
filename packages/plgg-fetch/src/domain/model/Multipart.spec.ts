import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { isSome, isNone } from "plgg";
import {
  field,
  file,
  multipart,
} from "plgg-fetch/index";

test("field builds a tagged text part", () =>
  check(
    field("name", "ada"),
    toEqual({
      kind: "field",
      name: "name",
      value: "ada",
    }),
  ));

test("file tags a binary part; contentType is optional", () =>
  all([
    check(
      file("f", "a.bin", new Uint8Array([1, 2]))
        .kind,
      toBe("file"),
    ),
    check(
      isNone(
        file("f", "a.bin", new Uint8Array([1]))
          .contentType,
      ),
      toBe(true),
    ),
    check(
      isSome(
        file(
          "f",
          "a.png",
          new Uint8Array([1]),
          "image/png",
        ).contentType,
      ),
      toBe(true),
    ),
  ]));

test("multipart preserves part order and count", () =>
  check(
    multipart([
      field("a", "1"),
      file("b", "b.txt", new Uint8Array([65])),
    ]).length,
    toBe(2),
  ));
