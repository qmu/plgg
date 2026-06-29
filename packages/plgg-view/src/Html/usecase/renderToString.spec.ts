import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import {
  el,
  text,
  div,
  input,
  h1,
  h3,
  h4,
  h5,
  h6,
  a,
  ol,
  li,
  code,
  pre,
  img,
  br,
  hr,
  blockquote,
  nav,
  table,
  thead,
  tbody,
  tr,
  th,
  td,
  details,
  summary,
  html,
  head,
  body,
  title,
  meta,
  link,
  style,
} from "plgg-view/Html/model/element";
import {
  class_,
  attr,
  onClick,
  fadeIn,
} from "plgg-view/Html/model/Attribute";
import { renderToString } from "plgg-view/Html/usecase/renderToString";
import {
  style_,
  hashClass,
} from "plgg-view/Style/usecase/style_";
import { p } from "plgg-view/Style/usecase/utilities";

test("renders an element with escaped attributes and children", () =>
  check(
    renderToString(
      div(
        [class_("todo")],
        [text("Buy <milk> & eggs")],
      ),
    ),
    toBe(
      '<div class="todo">Buy &lt;milk&gt; &amp; eggs</div>',
    ),
  ));

test("neutralizes a javascript: URL on a URL-bearing attribute", () => {
  const out = renderToString(
    el(
      "a",
      [attr("href", "javascript:alert(1)")],
      [text("x")],
    ),
  );
  return all([
    check(out, toContain('href="#"')),
    check(out, not(toContain("javascript:"))),
  ]);
});

test("preserves legitimate http/mailto/relative URLs", () =>
  all([
    check(
      renderToString(
        el(
          "a",
          [
            attr(
              "href",
              "https://example.com/p?q=1",
            ),
          ],
          [],
        ),
      ),
      toContain(
        'href="https://example.com/p?q=1"',
      ),
    ),
    check(
      renderToString(
        el(
          "a",
          [attr("href", "mailto:a@b.co")],
          [],
        ),
      ),
      toContain('href="mailto:a@b.co"'),
    ),
    check(
      renderToString(
        el(
          "a",
          [attr("href", "/local/path")],
          [],
        ),
      ),
      toContain('href="/local/path"'),
    ),
  ]));

test("drops an on* event-handler attribute name", () =>
  check(
    renderToString(
      el(
        "img",
        [attr("onerror", "alert(1)")],
        [],
      ),
    ),
    not(toContain("onerror")),
  ));

test("drops an unsafe tag emitted via the el() hatch", () =>
  check(
    renderToString(
      el("div onload=alert(1)", [], [text("x")]),
    ),
    toBe(""),
  ));

test("drops event handlers (no events on the server)", () =>
  check(
    renderToString(
      el(
        "button",
        [onClick<string>("clicked"), class_("b")],
        [text("Go")],
      ),
    ),
    toBe('<button class="b">Go</button>'),
  ));

test("drops animation directives (no animation on the server)", () =>
  check(
    renderToString(
      el(
        "div",
        [fadeIn(150), class_("box")],
        [text("Hi")],
      ),
    ),
    toBe('<div class="box">Hi</div>'),
  ));

test("emits style_() atomic classes as a class attribute", () =>
  check(
    renderToString(
      el(
        "div",
        [style_("todo", p(2))],
        [text("hi")],
      ),
    ),
    toBe(
      `<div class="todo ${hashClass("|padding:0.5rem")}">hi</div>`,
    ),
  ));

test("a style_() with no classes emits no class attribute", () =>
  check(
    renderToString(
      el("div", [style_()], [text("x")]),
    ),
    toBe("<div>x</div>"),
  ));

test("self-closes void elements", () =>
  check(
    renderToString(
      input([attr("type", "text")], []),
    ),
    toBe('<input type="text" />'),
  ));

test("drops attributes with unsafe names", () =>
  check(
    renderToString(
      el("div", [attr("on click", "x")], []),
    ),
    toBe("<div></div>"),
  ));

test("escapes attribute values that try to break out", () =>
  check(
    renderToString(
      el("a", [attr("title", '"><script>')], []),
    ),
    toBe(
      '<a title="&quot;&gt;&lt;script&gt;"></a>',
    ),
  ));

// --- new builders -----------------------------------

test("renders headings h3-h6", () =>
  all([
    check(
      renderToString(h3([], [text("a")])),
      toBe("<h3>a</h3>"),
    ),
    check(
      renderToString(h4([], [text("b")])),
      toBe("<h4>b</h4>"),
    ),
    check(
      renderToString(h5([], [text("c")])),
      toBe("<h5>c</h5>"),
    ),
    check(
      renderToString(h6([], [text("d")])),
      toBe("<h6>d</h6>"),
    ),
  ]));

test("renders an ordered list", () =>
  check(
    renderToString(
      ol(
        [],
        [
          li([], [text("one")]),
          li([], [text("two")]),
        ],
      ),
    ),
    toBe("<ol><li>one</li><li>two</li></ol>"),
  ));

test("renders pre>code (fenced block shape)", () =>
  check(
    renderToString(
      pre([], [code([], [text("x = 1")])]),
    ),
    toBe("<pre><code>x = 1</code></pre>"),
  ));

test("renders pre wrapping bare text", () =>
  check(
    renderToString(pre([], [text("raw <b>")])),
    toBe("<pre>raw &lt;b&gt;</pre>"),
  ));

test("renders a blockquote", () =>
  check(
    renderToString(
      blockquote([], [div([], [text("quote")])]),
    ),
    toBe(
      "<blockquote><div>quote</div></blockquote>",
    ),
  ));

test("self-closes img, br, hr void elements", () =>
  all([
    check(
      renderToString(
        img([attr("src", "/a.png")], []),
      ),
      toBe('<img src="/a.png" />'),
    ),
    check(
      renderToString(br([], [])),
      toBe("<br />"),
    ),
    check(
      renderToString(hr([], [])),
      toBe("<hr />"),
    ),
  ]));

test("renders a nav container", () =>
  check(
    renderToString(
      nav([], [a([], [text("Home")])]),
    ),
    toBe("<nav><a>Home</a></nav>"),
  ));

test("renders a nested table (thead/tbody/tr/th/td)", () =>
  check(
    renderToString(
      table(
        [],
        [
          thead(
            [],
            [tr([], [th([], [text("H")])])],
          ),
          tbody(
            [],
            [tr([], [td([], [text("D")])])],
          ),
        ],
      ),
    ),
    toBe(
      "<table>" +
        "<thead><tr><th>H</th></tr></thead>" +
        "<tbody><tr><td>D</td></tr></tbody>" +
        "</table>",
    ),
  ));

test("renders details with a summary child plus flow", () =>
  check(
    renderToString(
      details(
        [],
        [
          summary([], [text("More")]),
          div([], [text("body")]),
        ],
      ),
    ),
    toBe(
      "<details>" +
        "<summary>More</summary>" +
        "<div>body</div>" +
        "</details>",
    ),
  ));

test("renders a full html document shell with a leading doctype", () =>
  check(
    renderToString(
      html(
        [],
        [
          head(
            [],
            [
              title([], [text("Doc")]),
              meta(
                [attr("charset", "utf-8")],
                [],
              ),
              link(
                [
                  attr("rel", "stylesheet"),
                  attr("href", "/s.css"),
                ],
                [],
              ),
              style([], [text("body{margin:0}")]),
            ],
          ),
          body([], [h1([], [text("Hi")])]),
        ],
      ),
    ),
    toBe(
      "<!doctype html><html>" +
        "<head>" +
        "<title>Doc</title>" +
        '<meta charset="utf-8" />' +
        '<link rel="stylesheet" href="/s.css" />' +
        "<style>body{margin:0}</style>" +
        "</head>" +
        "<body><h1>Hi</h1></body>" +
        "</html>",
    ),
  ));

test("escapes a </style> breakout attempt in style text", () =>
  check(
    renderToString(
      style([], [text("a{}</style><script>")]),
    ),
    toBe(
      "<style>a{}&lt;/style&gt;&lt;script&gt;</style>",
    ),
  ));
