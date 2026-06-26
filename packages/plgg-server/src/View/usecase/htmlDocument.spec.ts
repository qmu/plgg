import {
  test,
  check,
  all,
  toContain,
  not,
} from "plgg-test";
import { div, h1, p, text } from "plgg-view";
import * as sx from "plgg-view/style";
import { htmlDocument } from "plgg-server/index";

test("wraps the root in a full document with a #root mount point", () => {
  const html = htmlDocument({
    title: "Hi & <there>",
    root: h1([], [text("Home")]),
  });
  return all([
    check(html, toContain("<!doctype html>")),
    check(
      html,
      toContain(
        "<title>Hi &amp; &lt;there&gt;</title>",
      ),
    ),
    check(
      html,
      toContain(
        '<div id="root"><h1>Home</h1></div>',
      ),
    ),
    // mobile viewport meta so phones lay out at device width, not ~980px desktop
    check(
      html,
      toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
      ),
    ),
    check(html, not(toContain("<script"))),
  ]);
});

test("injects a module script when clientEntry is given", () => {
  const html = htmlDocument({
    title: "x",
    root: p([], [text("y")]),
    clientEntry: "/client.js",
  });
  return check(
    html,
    toContain(
      '<script type="module" src="/client.js"></script>',
    ),
  );
});

test("inlines the root's css() atoms as a <style> in the head", () => {
  const html = htmlDocument({
    title: "x",
    root: div([sx.style_(sx.p(2))], [text("y")]),
  });
  return all([
    check(html, toContain("<style>")),
    check(html, toContain("padding:0.5rem}")),
    // the atomic class also rides in the body markup
    check(html, toContain('<div class="')),
  ]);
});

test("omits the <style> when the root has no css() atoms", () => {
  const html = htmlDocument({
    title: "x",
    root: p([], [text("y")]),
  });
  return check(html, not(toContain("<style>")));
});
