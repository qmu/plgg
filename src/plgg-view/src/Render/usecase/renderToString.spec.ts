import { test, expect } from "vitest";
import {
  element,
  text,
  fragment,
  h,
  renderToString,
} from "plgg-view/index";

test("renders a text node, escaping its content", () => {
  expect(renderToString(text("a < b & c"))).toBe(
    "a &lt; b &amp; c",
  );
});

test("renders an element with attributes and children", () => {
  expect(
    renderToString(
      element("a", { href: "/x", title: "go" }, [
        text("link"),
      ]),
    ),
  ).toBe('<a href="/x" title="go">link</a>');
});

test("void elements self-close and never wrap children", () => {
  expect(renderToString(element("br", {}, []))).toBe(
    "<br />",
  );
  expect(
    renderToString(element("img", { src: "/a.png" }, [])),
  ).toBe('<img src="/a.png" />');
  // children handed to a void element are ignored
  expect(
    renderToString(element("hr", {}, [text("x")])),
  ).toBe("<hr />");
});

test("fragments render children with no wrapping tag", () => {
  expect(
    renderToString(
      fragment([
        element("span", {}, [text("a")]),
        element("span", {}, [text("b")]),
      ]),
    ),
  ).toBe("<span>a</span><span>b</span>");
});

test("attribute values are escaped against breakout", () => {
  expect(
    renderToString(
      element("a", { title: '"><script>' }, []),
    ),
  ).toBe('<a title="&quot;&gt;&lt;script&gt;"></a>');
});

test("unsafe attribute names are dropped, safe ones kept", () => {
  expect(
    renderToString(
      element(
        "div",
        { "data-ok": "1", "bad name": "2" },
        [],
      ),
    ),
  ).toBe('<div data-ok="1"></div>');
});

test("renders a nested tree built with h", () => {
  expect(
    renderToString(
      h(
        "section",
        { id: "main" },
        h("h1", null, "Title"),
        h("p", null, "Body & more"),
      ),
    ),
  ).toBe(
    '<section id="main"><h1>Title</h1><p>Body &amp; more</p></section>',
  );
});
