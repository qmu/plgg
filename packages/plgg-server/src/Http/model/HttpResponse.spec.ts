import { test, expect } from "vitest";
import {
  textResponse,
  htmlResponse,
  jsonResponse,
  bytesResponse,
  streamResponse,
  redirectResponse,
} from "plgg-server/index";

async function* twoChunks(): AsyncIterable<Uint8Array> {
  yield new Uint8Array([1, 2]);
  yield new Uint8Array([3]);
}

test("textResponse defaults status 200 and text/plain content-type", () => {
  const r = textResponse("hi");
  expect(r.status.content).toBe(200);
  expect(r.headers["content-type"]).toBe(
    "text/plain; charset=utf-8",
  );
  expect(r.body).toBe("hi");
});

test("htmlResponse sets text/html", () => {
  const r = htmlResponse("<b>x</b>", 201);
  expect(r.status.content).toBe(201);
  expect(r.headers["content-type"]).toBe(
    "text/html; charset=utf-8",
  );
});

test("jsonResponse serializes and sets application/json", () => {
  const r = jsonResponse({ a: 1 }, 201);
  expect(r.status.content).toBe(201);
  expect(r.headers["content-type"]).toBe(
    "application/json; charset=utf-8",
  );
  expect(r.body).toBe('{"a":1}');
});

test("a caller-supplied content-type is preserved", () => {
  const r = jsonResponse({}, 200, {
    "content-type": "application/ld+json",
  });
  expect(r.headers["content-type"]).toBe(
    "application/ld+json",
  );
});

test("bytesResponse defaults 200 and octet-stream, wrapping a Bytes body", () => {
  const r = bytesResponse(new Uint8Array([1, 2, 3]));
  expect(r.status.content).toBe(200);
  expect(r.headers["content-type"]).toBe(
    "application/octet-stream",
  );
  expect(typeof r.body).not.toBe("string");
  if (
    typeof r.body !== "string" &&
    r.body.__tag === "Bytes"
  ) {
    expect(Array.from(r.body.content)).toEqual([
      1, 2, 3,
    ]);
  }
});

test("bytesResponse honors an explicit status and content-type", () => {
  const r = bytesResponse(new Uint8Array([0]), 206, {
    "content-type": "image/png",
  });
  expect(r.status.content).toBe(206);
  expect(r.headers["content-type"]).toBe("image/png");
});

test("streamResponse wraps a Stream body and defaults octet-stream", () => {
  const r = streamResponse(twoChunks());
  expect(r.headers["content-type"]).toBe(
    "application/octet-stream",
  );
  expect(typeof r.body).not.toBe("string");
  if (typeof r.body !== "string") {
    expect(r.body.__tag).toBe("Stream");
  }
});

test("redirectResponse defaults 302 and sets location", () => {
  const r = redirectResponse("/login");
  expect(r.status.content).toBe(302);
  expect(r.headers["location"]).toBe("/login");
  expect(r.body).toBe("");
  expect(redirectResponse("/x", 301).status.content).toBe(
    301,
  );
});
