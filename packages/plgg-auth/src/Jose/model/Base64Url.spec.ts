import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { Bin, box } from "plgg";
import {
  encodeBase64Url,
  decodeBase64Url,
  asBase64UrlStr,
  isBase64UrlStr,
  base64UrlString,
  utf8Bytes,
  utf8String,
  toBufferSource,
} from "plgg-auth/index";

const vectors: ReadonlyArray<
  readonly [string, string]
> = [
  ["", ""],
  ["f", "Zg"],
  ["fo", "Zm8"],
  ["foo", "Zm9v"],
  ["foob", "Zm9vYg"],
  ["fooba", "Zm9vYmE"],
  ["foobar", "Zm9vYmFy"],
];

test("encodeBase64Url matches the RFC 4648 vectors, unpadded", () =>
  all(
    vectors.map(([raw, encoded]) =>
      check(
        base64UrlString(
          encodeBase64Url(utf8Bytes(raw)),
        ),
        toBe(encoded),
      ),
    ),
  ));

test("encodeBase64Url uses the url-safe alphabet (- and _)", () =>
  check(
    base64UrlString(
      encodeBase64Url(
        new Uint8Array([0xfb, 0xff]),
      ),
    ),
    toBe("-_8"),
  ));

test("decode roundtrips encode across chunk boundaries", () => {
  const bytes = new Uint8Array(10000).map(
    (_, i) => i % 251,
  );
  return check(
    decodeBase64Url(encodeBase64Url(bytes)),
    okThen((decoded: Bin) =>
      toEqual(Array.from(bytes))(
        Array.from(decoded),
      ),
    ),
  );
});

test("asBase64UrlStr rejects the standard-base64 alphabet", () =>
  check(
    asBase64UrlStr("a+b/c="),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asBase64UrlStr accepts an already-branded value", () =>
  check(
    asBase64UrlStr(
      encodeBase64Url(utf8Bytes("x")),
    ),
    okThen((b) =>
      check(isBase64UrlStr(b), toBe(true)),
    ),
  ));

test("decodeBase64Url fails on an impossible length", () =>
  check(
    decodeBase64Url(box("Base64UrlStr")("a")),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("utf8String fails on invalid UTF-8 instead of substituting", () =>
  check(
    utf8String(
      new Uint8Array([0xff, 0xfe, 0xfd]),
    ),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("utf8 helpers roundtrip multibyte text", () =>
  check(
    utf8String(utf8Bytes("こんにちは")),
    okThen((s) => toBe("こんにちは")(s)),
  ));

test("toBufferSource copies into a fresh ArrayBuffer-backed view", () => {
  const original = new Uint8Array([1, 2, 3]);
  const copy = toBufferSource(original);
  return all([
    check(
      Array.from(copy),
      toEqual(Array.from(original)),
    ),
    check(copy === original, toBe(false)),
  ]);
});
