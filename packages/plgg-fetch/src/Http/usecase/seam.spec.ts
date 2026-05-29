import { test, expect } from "vitest";
import { isOk, isErr, none } from "plgg";
import {
  HttpRequest,
  bytesBody,
} from "plgg-server";
import {
  toFetchRequest,
  fromFetchResponse,
  messageOf,
} from "plgg-fetch/index";

const baseRequest = (
  overrides: Partial<HttpRequest>,
): HttpRequest => ({
  method: "GET",
  path: "http://example.test/",
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
  ...overrides,
});

test("messageOf reads an Error's message and stringifies anything else", () => {
  expect(messageOf(new Error("boom"))).toBe("boom");
  expect(messageOf("oops")).toBe("oops");
  expect(messageOf(42)).toBe("42");
});

test("toFetchRequest builds a native Request with method, query, headers, and body", async () => {
  const native = toFetchRequest(
    baseRequest({
      method: "POST",
      path: "http://example.test/users",
      query: { q: "cat", page: "2" },
      headers: { "content-type": "application/json" },
      body: '{"name":"Ada"}',
    }),
  );
  expect(native.method).toBe("POST");
  const url = new URL(native.url);
  expect(url.searchParams.get("q")).toBe("cat");
  expect(url.searchParams.get("page")).toBe("2");
  expect(native.headers.get("content-type")).toBe(
    "application/json",
  );
  await expect(native.text()).resolves.toBe(
    '{"name":"Ada"}',
  );
});

test("toFetchRequest omits the body on a GET, even if one is supplied", async () => {
  const native = toFetchRequest(
    baseRequest({ method: "GET", body: "ignored" }),
  );
  expect(native.method).toBe("GET");
  await expect(native.text()).resolves.toBe("");
});

test("toFetchRequest throws on a malformed URL", () => {
  expect(() =>
    toFetchRequest(baseRequest({ path: "not a url" })),
  ).toThrow();
});

test("fromFetchResponse lifts status, headers, and body into an HttpResponse", async () => {
  const result = await fromFetchResponse(
    new Response("hi", {
      status: 201,
      headers: { "x-extra": "v" },
    }),
  );
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.status.content).toBe(201);
    expect(result.content.headers["x-extra"]).toBe("v");
    expect(result.content.body).toBe("hi");
  }
});

test("fromFetchResponse treats a non-2xx status as a valid response, not an error", async () => {
  const result = await fromFetchResponse(
    new Response("Not Found", { status: 404 }),
  );
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content.status.content).toBe(404);
    expect(result.content.body).toBe("Not Found");
  }
});

test("fromFetchResponse folds a failed body read into a NetworkError", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start: (controller) =>
      controller.error(new Error("read failed")),
  });
  const result = await fromFetchResponse(
    new Response(stream),
  );
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.__tag).toBe("NetworkError");
  }
});

test("bytesBody is the reused router type the client never produces", () => {
  // documents that the client's text seam and the router's binary body share
  // one ResponseBody union — the client simply stays on the text path.
  expect(bytesBody(new Uint8Array([1])).__tag).toBe(
    "Bytes",
  );
});
