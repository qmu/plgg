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
} from "plgg-view/Html/model/element";
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
import { collectCss } from "plgg-view/Html/usecase/collectCss";

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
