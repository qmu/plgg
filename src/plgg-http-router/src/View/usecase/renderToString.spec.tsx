import { test, expect } from "vitest";
import { jsx } from "plgg-view/jsx-runtime";
import { renderToString } from "plgg-http-router/index";

test("renders an element with escaped attributes and children", () => {
  expect(
    renderToString(
      <a href="/x" title={'"&<'}>
        go & <b>bold</b>
      </a>,
    ),
  ).toBe(
    '<a href="/x" title="&quot;&amp;&lt;">go &amp; <b>bold</b></a>',
  );
});

test("void elements self-close and never wrap children", () => {
  expect(renderToString(<img src="/a.png" />)).toBe(
    '<img src="/a.png" />',
  );
  expect(renderToString(<br />)).toBe("<br />");
});

test("fragments render their children with no wrapper", () => {
  expect(
    renderToString(
      <>
        <span>a</span>
        <span>b</span>
      </>,
    ),
  ).toBe("<span>a</span><span>b</span>");
});

test("text content is escaped (XSS-safe)", () => {
  expect(renderToString(<p>{"<x> & </x>"}</p>)).toBe(
    "<p>&lt;x&gt; &amp; &lt;/x&gt;</p>",
  );
});

test("unsafe attribute names are dropped, safe ones kept", () => {
  // build with the runtime directly to inject a non-grammatical prop name
  const node = jsx("div", {
    "data-ok": "1",
    "bad name": "2",
  });
  expect(renderToString(node)).toBe('<div data-ok="1"></div>');
});
