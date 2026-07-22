import {
  test,
  check,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
  shouldBeErr,
} from "plgg-test";
import {
  Obj,
  Result,
  InvalidError,
  SoftStr,
  cast,
  asObj,
  asSoftStr,
  forProp,
  isOk,
} from "plgg";
import {
  HttpResponse,
  statusOf,
  bytesBody,
  streamBody,
} from "plgg-http";
import {
  decodeJsonBody,
  readText,
  readBytes,
  readStream,
} from "plgg-fetch/index";

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

test("decodeJsonBody parses a JSON body into a typed value", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith('{"name":"Ada"}'),
    ),
    okThen((u) => check(u.name, toBe("Ada"))),
  ));

test("decodeJsonBody surfaces a JSON syntax error as InvalidError", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith("not json"),
    ),
    shouldBeErr(),
  ));

test("decodeJsonBody surfaces a shape mismatch as InvalidError", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith('{"name":123}'),
    ),
    shouldBeErr(),
  ));

test("decodeJsonBody rejects a non-text (bytes) body", () =>
  check(
    decodeJsonBody(asUser)(
      responseWith(
        bytesBody(new Uint8Array([1, 2])),
      ),
    ),
    errThen((e) =>
      check(
        e.content.message,
        toContain("not text"),
      ),
    ),
  ));

test("readText reads a text body", () =>
  check(
    readText(responseWith("hello")),
    okThen(toBe("hello")),
  ));

test("readBytes reads a Bytes body", () =>
  check(
    readBytes(
      responseWith(
        bytesBody(new Uint8Array([1, 2, 3])),
      ),
    ),
    okThen((b) => check([...b], toEqual([1, 2, 3]))),
  ));

test("readBytes rejects a non-bytes body", () =>
  check(readBytes(responseWith("nope")), shouldBeErr()));

test("readStream reads a Stream body incrementally", async () => {
  async function* chunks(): AsyncGenerator<Uint8Array> {
    yield new Uint8Array([104]);
    yield new Uint8Array([105]);
  }
  const res = readStream(
    responseWith(streamBody(chunks())),
  );
  if (!isOk(res)) {
    throw new Error("expected a stream body");
  }
  const collected: number[] = [];
  for await (const c of res.content) {
    collected.push(...c);
  }
  return check(collected, toEqual([104, 105]));
});

test("readStream rejects a non-stream body", () =>
  check(
    readStream(
      responseWith(bytesBody(new Uint8Array([1]))),
    ),
    shouldBeErr(),
  ));
