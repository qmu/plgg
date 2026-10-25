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
  span,
  lazy,
} from "plgg-view/Html/model/element";
import { type Html } from "plgg-view/Html/model/Html";
import {
  class_,
  onClick,
  fadeIn,
} from "plgg-view/Html/model/Attribute";
import {
  style_,
  hover,
  hashClass,
} from "plgg-view/Style/usecase/style_";
import { decl } from "plgg-view/Style/model/Style";
import {
  p,
  bg,
} from "plgg-view/Style/usecase/utilities";
import {
  collectCss,
  collectCssRules,
} from "plgg-view/Html/usecase/collectCss";

test("collectCss renders the atomic rules of a tree (base + :hover)", () => {
  const tree = el(
    "div",
    [style_(p(3), hover(bg("primary")))],
    [text("x")],
  );
  const sheet = collectCss(tree);
  return all([
    check(
      sheet,
      toContain(
        `.${hashClass("|padding:0.75rem")}{padding:0.75rem}`,
      ),
    ),
    check(
      sheet,
      toContain(
        ":hover{background-color:#1f6b54}",
      ),
    ),
  ]);
});

test("collectCss dedups an atom used on many elements", () => {
  const tree = el(
    "ul",
    [],
    [
      el("li", [style_(p(3))], []),
      el("li", [style_(p(3))], []),
    ],
  );
  const cls = hashClass("|padding:0.75rem");
  const sheet = collectCss(tree);
  // the rule body appears exactly once despite two uses
  return check(
    sheet.split(`.${cls}{`).length - 1,
    toBe(1),
  );
});

test("collectCss skips static attrs, handlers, animations, and text", () => {
  const tree = el(
    "button",
    [
      class_("x"),
      onClick<string>("go"),
      fadeIn(100),
      style_(p(2)),
    ],
    [text("Go")],
  );
  return check(
    collectCss(tree),
    toBe(
      `.${hashClass("|padding:0.5rem")}{padding:0.5rem}`,
    ),
  );
});

test("a tree with no style_() atoms yields an empty sheet", () =>
  check(
    collectCss(
      el("div", [class_("x")], [text("hi")]),
    ),
    toBe(""),
  ));

test("collectCss escapes a malicious declaration value (no </style> or } breakout)", () => {
  const tree = el(
    "div",
    [
      style_(
        decl(
          "color",
          "red}</style><script>alert(1)</script>",
        ),
      ),
    ],
    [text("x")],
  );
  const sheet = collectCss(tree);
  // the breakout characters are CSS-hex-escaped, never emitted raw
  return all([
    check(sheet, not(toContain("</style>"))),
    check(sheet, not(toContain("}<"))),
    check(sheet, not(toContain("<script>"))),
    // a single closing brace per rule (the one renderCssRule writes)
    check(sheet.split("}").length - 1, toBe(1)),
  ]);
});

test("collectCss preserves legitimate selector combinators and url() values", () =>
  check(
    collectCss(
      el(
        "div",
        [
          style_(
            decl(
              "background",
              "url(https://example.com/a.png)",
            ),
          ),
        ],
        [text("x")],
      ),
    ),
    toContain(
      "background:url(https://example.com/a.png)",
    ),
  ));

// --- lazy — collection resolves it transparently, but memoized by `arg` ---

test("collectCss resolves a lazy node's rules", () =>
  check(
    collectCss(
      el(
        "div",
        [],
        [
          lazy(
            (n: number) =>
              el("span", [style_(p(n))], []),
            2,
          ),
        ],
      ),
    ),
    toContain(
      `.${hashClass("|padding:0.5rem")}{padding:0.5rem}`,
    ),
  ));

test("a re-collection with the SAME arg does not re-invoke the lazy producer", () => {
  let calls = 0;
  const arg = { n: 3 };
  const row = (a: {
    n: number;
  }): Html<never, "span"> => {
    calls++;
    return span([style_(p(a.n))], []);
  };
  collectCssRules(div([], [lazy(row, arg)]));
  const callsAfterFirst = calls;
  collectCssRules(div([], [lazy(row, arg)])); // same `arg` reference
  return check(calls, toBe(callsAfterFirst));
});

test("two lazy() call sites sharing the same arg object do not collide on one cache entry", () => {
  // a shared arg reference (e.g. two columns memoized off the same config
  // object) must not let one producer's rules shadow the other's
  const sharedArg = {};
  const header = (): Html<never, "span"> =>
    span([style_(p(3))], []);
  const footer = (): Html<never, "span"> =>
    span([style_(p(2))], []);
  const sheet = collectCss(
    div(
      [],
      [
        lazy(header, sharedArg),
        lazy(footer, sharedArg),
      ],
    ),
  );
  return all([
    check(
      sheet,
      toContain(
        `.${hashClass("|padding:0.75rem")}{padding:0.75rem}`,
      ),
    ),
    check(
      sheet,
      toContain(
        `.${hashClass("|padding:0.5rem")}{padding:0.5rem}`,
      ),
    ),
  ]);
});
