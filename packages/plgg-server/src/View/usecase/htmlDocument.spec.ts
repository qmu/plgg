import { test, expect } from "vitest";
import { div, h1, p, text } from "plgg-view";
import * as sx from "plgg-view/style";
import { htmlDocument } from "plgg-server/index";

test("wraps the root in a full document with a #root mount point", () => {
  const html = htmlDocument({
    title: "Hi & <there>",
    root: h1([], [text("Home")]),
  });
  expect(html).toContain("<!doctype html>");
  expect(html).toContain(
    "<title>Hi &amp; &lt;there&gt;</title>",
  );
  expect(html).toContain(
    '<div id="root"><h1>Home</h1></div>',
  );
  expect(html).not.toContain("<script");
});

test("injects a module script when clientEntry is given", () => {
  const html = htmlDocument({
    title: "x",
    root: p([], [text("y")]),
    clientEntry: "/client.js",
  });
  expect(html).toContain(
    '<script type="module" src="/client.js"></script>',
  );
});

test("inlines the root's css() atoms as a <style> in the head", () => {
  const html = htmlDocument({
    title: "x",
    root: div([sx.css(sx.p(2))], [text("y")]),
  });
  expect(html).toContain("<style>");
  expect(html).toContain("padding:0.5rem}");
  // the atomic class also rides in the body markup
  expect(html).toContain('<div class="');
});

test("omits the <style> when the root has no css() atoms", () => {
  const html = htmlDocument({
    title: "x",
    root: p([], [text("y")]),
  });
  expect(html).not.toContain("<style>");
});
