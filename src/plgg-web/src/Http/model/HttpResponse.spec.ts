import { test, expect } from "vitest";
import {
  textResponse,
  htmlResponse,
  jsonResponse,
  redirectResponse,
} from "plgg-web/index";

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

test("redirectResponse defaults 302 and sets location", () => {
  const r = redirectResponse("/login");
  expect(r.status.content).toBe(302);
  expect(r.headers["location"]).toBe("/login");
  expect(r.body).toBe("");
  expect(redirectResponse("/x", 301).status.content).toBe(
    301,
  );
});
