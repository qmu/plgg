import { test, expect } from "vitest";
import {
  viewResponse,
  pageResponse,
  javascriptResponse,
} from "plgg-http-router/index";

test("viewResponse is a text/html response carrying the rendered markup", () => {
  const r = viewResponse(<p>hi</p>);
  expect(r.status.content).toBe(200);
  expect(r.headers["content-type"]).toBe(
    "text/html; charset=utf-8",
  );
  expect(r.body).toBe("<p>hi</p>");
});

test("pageResponse renders a full document", () => {
  const r = pageResponse({ title: "T", root: <main>m</main> });
  expect(r.headers["content-type"]).toBe(
    "text/html; charset=utf-8",
  );
  expect(
    typeof r.body === "string" &&
      r.body.includes('<div id="root"><main>m</main></div>'),
  ).toBe(true);
});

test("javascriptResponse serves a text/javascript body", () => {
  const r = javascriptResponse("console.log(1)");
  expect(r.headers["content-type"]).toBe(
    "text/javascript; charset=utf-8",
  );
  expect(r.body).toBe("console.log(1)");
  expect(r.status.content).toBe(200);
});
