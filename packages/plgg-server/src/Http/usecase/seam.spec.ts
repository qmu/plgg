import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { isSome } from "plgg";
import {
  toHttpRequest,
  toNativeResponse,
  textResponse,
  bytesResponse,
  streamResponse,
} from "plgg-server/index";

async function* bytesStream(): AsyncIterable<Uint8Array> {
  yield new Uint8Array([1, 2]);
  yield new Uint8Array([3]);
}

test("toHttpRequest lifts method, path, query, headers, and body", async () => {
  const native = new Request(
    "http://example.test/users/7?q=cat",
    {
      method: "POST",
      headers: { "X-Token": "abc" },
      body: "payload",
    },
  );
  return check(
    await toHttpRequest(native),
    okThen((r) =>
      all([
        check(r.method, toBe("POST")),
        check(r.path, toBe("/users/7")),
        check(r.query, toEqual({ q: "cat" })),
        // header keys are lowercased
        check(r.headers["x-token"], toBe("abc")),
        check(r.params, toEqual({})),
        check(r.body, toBe("payload")),
      ]),
    ),
  );
});

test("toHttpRequest rejects an unsupported method as Unsupported", async () => {
  const native = new Request("http://x/", {
    method: "PURGE",
  });
  return check(
    await toHttpRequest(native),
    errThen((e) =>
      check(e.__tag, toBe("Unsupported")),
    ),
  );
});

test("toNativeResponse unwraps status, headers, and body", async () => {
  const native = toNativeResponse(
    textResponse("hello", 201, {
      "content-type": "text/plain",
      "x-extra": "1",
    }),
  );
  return all([
    check(native.status, toBe(201)),
    check(
      native.headers.get("x-extra"),
      toBe("1"),
    ),
    check(await native.text(), toBe("hello")),
  ]);
});

test("toNativeResponse maps a bytes body and sets Content-Length", async () => {
  const native = toNativeResponse(
    bytesResponse(new Uint8Array([7, 8, 9])),
  );
  const a1 = check(
    native.headers.get("content-length"),
    toBe("3"),
  );
  const buf = new Uint8Array(
    await native.arrayBuffer(),
  );
  return all([
    a1,
    check(Array.from(buf), toEqual([7, 8, 9])),
  ]);
});

test("toNativeResponse preserves a caller-supplied Content-Length on a bytes body", () => {
  const native = toNativeResponse(
    bytesResponse(new Uint8Array([1, 2, 3]), 200, {
      "content-length": "99",
    }),
  );
  return check(
    native.headers.get("content-length"),
    toBe("99"),
  );
});

test("toNativeResponse streams a stream body", async () => {
  const native = toNativeResponse(
    streamResponse(bytesStream()),
  );
  const buf = new Uint8Array(
    await native.arrayBuffer(),
  );
  return check(
    Array.from(buf),
    toEqual([1, 2, 3]),
  );
});

test("toHttpRequest surfaces a non-text body as bytes, leaving body empty", async () => {
  const native = new Request("http://x/upload", {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
    },
    body: new Uint8Array([1, 2, 3, 4]),
  });
  return check(
    await toHttpRequest(native),
    okThen((r) =>
      all([
        check(r.body, toBe("")),
        check(isSome(r.bytes), toBe(true)),
        check(
          isSome(r.bytes)
            ? Array.from(r.bytes.content)
            : [],
          toEqual([1, 2, 3, 4]),
        ),
      ]),
    ),
  );
});

test("toHttpRequest keeps a JSON body as decoded text (no bytes)", async () => {
  const native = new Request("http://x/data", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"a":1}',
  });
  return check(
    await toHttpRequest(native),
    okThen((r) =>
      all([
        check(r.body, toBe('{"a":1}')),
        check(isSome(r.bytes), toBe(false)),
      ]),
    ),
  );
});
