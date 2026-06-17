import { test, expect, assert } from "vitest";
import { pipe, ok, box, isOk, isErr } from "plgg";
import {
  web,
  get,
  textResponse,
  statusOf,
  HttpResponse,
} from "plgg-server/index";
import {
  renderPath,
  renderRoutes,
  toPage,
} from "plgg-server/Ssg/usecase/renderRoutes";

const app = pipe(
  web(),
  get("/", async () =>
    ok(textResponse("<h1>home</h1>")),
  ),
  get("/missing", async () =>
    ok(textResponse("gone", 404)),
  ),
);

test("toPage folds a 2xx string body into a page", () => {
  const response: HttpResponse = {
    status: statusOf(200),
    headers: {},
    body: "<p>hi</p>",
  };
  const result = toPage("/x")(response);
  assert(isOk(result));
  expect(result.content.path).toBe("/x");
  expect(result.content.html).toBe("<p>hi</p>");
});

test("toPage rejects a non-2xx status as NonOkStatus", () => {
  const response: HttpResponse = {
    status: statusOf(500),
    headers: {},
    body: "boom",
  };
  const result = toPage("/x")(response);
  assert(isErr(result));
  expect(result.content.__tag).toBe(
    "NonOkStatus",
  );
});

test("toPage rejects a non-string body as NonHtmlBody", () => {
  const response: HttpResponse = {
    status: statusOf(200),
    headers: {},
    body: box("Bytes")(new Uint8Array([1, 2])),
  };
  const result = toPage("/x")(response);
  assert(isErr(result));
  expect(result.content.__tag).toBe(
    "NonHtmlBody",
  );
});

test("renderPath renders a real route to a page", async () => {
  const result = await renderPath(app)("/");
  assert(isOk(result));
  expect(result.content.html).toBe(
    "<h1>home</h1>",
  );
});

test("renderPath folds a 404 route to NonOkStatus", async () => {
  const result =
    await renderPath(app)("/missing");
  assert(isErr(result));
  expect(result.content.__tag).toBe(
    "NonOkStatus",
  );
});

test("renderPath folds an unmatched path to RenderFailed", async () => {
  const result = await renderPath(app)("/nope");
  assert(isErr(result));
  expect(result.content.__tag).toBe(
    "RenderFailed",
  );
});

test("renderRoutes collects every page in order", async () => {
  const result = await renderRoutes(app)(["/"]);
  assert(isOk(result));
  expect(result.content).toHaveLength(1);
  expect(result.content[0]?.html).toBe(
    "<h1>home</h1>",
  );
});

test("renderRoutes short-circuits to the first failure", async () => {
  const result = await renderRoutes(app)([
    "/",
    "/missing",
  ]);
  assert(isErr(result));
  expect(result.content.__tag).toBe(
    "NonOkStatus",
  );
});
