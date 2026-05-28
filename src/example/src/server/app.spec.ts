import { test, expect } from "vitest";
import {
  isOk,
  pipe,
  decodeJson,
  chainResult,
} from "plgg";
import { toFetch } from "plgg-http-router";
import { createArticlesDb } from "../db/open";
import { buildApp } from "./app";
import { asArticles } from "../modeling/Article";

// Real components, not mocks: each test runs against an actual in-memory
// node:sqlite database seeded by createArticlesDb.

test("GET /api/articles returns the seeded rows, decodable to Articles", async () => {
  const db = await createArticlesDb();
  const handler = toFetch(buildApp(db, ""));
  const res = await handler(
    new Request("http://test/api/articles"),
  );
  expect(res.status).toBe(200);
  const decoded = pipe(
    decodeJson(await res.text()),
    chainResult(asArticles),
  );
  expect(isOk(decoded)).toBe(true);
  if (isOk(decoded)) {
    expect(decoded.content.length).toBe(3);
    expect(
      decoded.content.map((a) => a.name),
    ).toContain("Errors as values");
  }
});

test("GET / renders the articles as an SSR page (incl. the None memo)", async () => {
  const db = await createArticlesDb();
  const handler = toFetch(
    buildApp(db, "/* client bundle */"),
  );
  const res = await handler(
    new Request("http://test/"),
  );
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("plgg full-stack demo");
  expect(html).toContain(
    "Pipelines all the way down",
  );
  expect(html).toContain("(no memo)");
});

test("GET /client.js serves the bundle", async () => {
  const db = await createArticlesDb();
  const handler = toFetch(
    buildApp(db, "console.log('hi')"),
  );
  const res = await handler(
    new Request("http://test/client.js"),
  );
  expect(res.status).toBe(200);
  expect(await res.text()).toContain(
    "console.log('hi')",
  );
});
