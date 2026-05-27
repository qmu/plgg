import { test, expect } from "vitest";
import { isOk, isErr, isSome } from "plgg";
import {
  toHttpRequest,
  toNativeResponse,
  textResponse,
  bytesResponse,
  streamResponse,
} from "plgg-web/index";

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
  const result = await toHttpRequest(native);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    const r = result.content;
    expect(r.method).toBe("POST");
    expect(r.path).toBe("/users/7");
    expect(r.query).toEqual({ q: "cat" });
    // header keys are lowercased
    expect(r.headers["x-token"]).toBe("abc");
    expect(r.params).toEqual({});
    expect(r.body).toBe("payload");
  }
});

test("toHttpRequest rejects an unsupported method as Unsupported", async () => {
  const native = new Request("http://x/", {
    method: "PURGE",
  });
  const result = await toHttpRequest(native);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.__tag).toBe("Unsupported");
  }
});

test("toNativeResponse unwraps status, headers, and body", async () => {
  const native = toNativeResponse(
    textResponse("hello", 201, {
      "content-type": "text/plain",
      "x-extra": "1",
    }),
  );
  expect(native.status).toBe(201);
  expect(native.headers.get("x-extra")).toBe("1");
  await expect(native.text()).resolves.toBe("hello");
});

test("toNativeResponse maps a bytes body and sets Content-Length", async () => {
  const native = toNativeResponse(
    bytesResponse(new Uint8Array([7, 8, 9])),
  );
  expect(native.headers.get("content-length")).toBe(
    "3",
  );
  const buf = new Uint8Array(
    await native.arrayBuffer(),
  );
  expect(Array.from(buf)).toEqual([7, 8, 9]);
});

test("toNativeResponse preserves a caller-supplied Content-Length on a bytes body", () => {
  const native = toNativeResponse(
    bytesResponse(new Uint8Array([1, 2, 3]), 200, {
      "content-length": "99",
    }),
  );
  expect(native.headers.get("content-length")).toBe(
    "99",
  );
});

test("toNativeResponse streams a stream body", async () => {
  const native = toNativeResponse(
    streamResponse(bytesStream()),
  );
  const buf = new Uint8Array(
    await native.arrayBuffer(),
  );
  expect(Array.from(buf)).toEqual([1, 2, 3]);
});

test("toHttpRequest surfaces a non-text body as bytes, leaving body empty", async () => {
  const native = new Request("http://x/upload", {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
    },
    body: new Uint8Array([1, 2, 3, 4]),
  });
  const result = await toHttpRequest(native);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.body).toBe("");
    expect(isSome(result.content.bytes)).toBe(true);
    if (isSome(result.content.bytes)) {
      expect(
        Array.from(result.content.bytes.content),
      ).toEqual([1, 2, 3, 4]);
    }
  }
});

test("toHttpRequest keeps a JSON body as decoded text (no bytes)", async () => {
  const native = new Request("http://x/data", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"a":1}',
  });
  const result = await toHttpRequest(native);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.body).toBe('{"a":1}');
    expect(isSome(result.content.bytes)).toBe(false);
  }
});
