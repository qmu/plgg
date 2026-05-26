import { test, expect } from "vitest";
import { isOk, isErr } from "plgg";
import {
  toHttpRequest,
  toNativeResponse,
  textResponse,
} from "plgg-web/index";

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
