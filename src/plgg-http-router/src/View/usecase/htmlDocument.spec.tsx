import { test, expect } from "vitest";
import { htmlDocument } from "plgg-http-router/index";

test("wraps the root in a full document with a #root mount point", () => {
  const html = htmlDocument({
    title: "Hi & <there>",
    root: <h1>Home</h1>,
  });
  expect(html).toContain("<!doctype html>");
  expect(html).toContain(
    "<title>Hi &amp; &lt;there&gt;</title>",
  );
  expect(html).toContain('<div id="root"><h1>Home</h1></div>');
  expect(html).not.toContain("<script");
});

test("injects a module script when clientEntry is given", () => {
  const html = htmlDocument({
    title: "x",
    root: <p>y</p>,
    clientEntry: "/client.js",
  });
  expect(html).toContain(
    '<script type="module" src="/client.js"></script>',
  );
});
