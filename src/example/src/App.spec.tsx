// @vitest-environment happy-dom
import { test, expect } from "vitest";
import { renderToString } from "plgg-http-router";
import { render } from "plgg-http-router/client";
import { App } from "./App";

// The same App, rendered two ways — proving the component tree is isomorphic.

test("SSR: the server renders App to an HTML string", () => {
  const html = renderToString(App());
  expect(html).toContain("plgg-http-router isomorphic demo");
  expect(html).toContain("Server-side rendering");
  expect(html.match(/<li class="/g)?.length).toBe(3);
});

test("CSR: the client renders the same App into the DOM", () => {
  const root = document.createElement("div");
  render(App(), root);
  expect(root.querySelector("h1")?.textContent).toContain(
    "isomorphic demo",
  );
  expect(root.querySelectorAll("li.done").length).toBe(2);
  expect(root.querySelectorAll("li").length).toBe(3);
});
