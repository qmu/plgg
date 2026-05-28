// @vitest-environment happy-dom
import { test, expect } from "vitest";
import { isOk } from "plgg";
import { renderToString } from "plgg-server";
import { render } from "plgg-server/client";
import { App } from "./App";
import { asArticles } from "./modeling/Article";

// The same data-driven App, rendered two ways — proving the tree is isomorphic.
// `a2` omits `memo` to exercise the `Option` None branch.
const RAW = [
  {
    id: "a1",
    createdAt: "2026-05-01T09:00:00Z",
    name: "Pipelines all the way down",
    memo: "first",
  },
  {
    id: "a2",
    createdAt: "2026-05-02T09:00:00Z",
    name: "Errors as values",
  },
];

test("SSR: the server renders the articles to an HTML string", () => {
  const decoded = asArticles(RAW);
  expect(isOk(decoded)).toBe(true);
  if (isOk(decoded)) {
    const html = renderToString(
      App({ articles: decoded.content }),
    );
    expect(html).toContain("plgg full-stack demo");
    expect(html).toContain("Errors as values");
    expect(html).toContain("first");
    expect(html).toContain("(no memo)");
  }
});

test("CSR: the client renders the same App into the DOM", () => {
  const decoded = asArticles(RAW);
  expect(isOk(decoded)).toBe(true);
  if (isOk(decoded)) {
    const root = document.createElement("div");
    render(App({ articles: decoded.content }), root);
    expect(
      root.querySelector("h1")?.textContent,
    ).toContain("full-stack demo");
    expect(
      root.querySelectorAll("li.article").length,
    ).toBe(2);
    expect(
      root.querySelectorAll("p.memo.empty").length,
    ).toBe(1);
  }
});
