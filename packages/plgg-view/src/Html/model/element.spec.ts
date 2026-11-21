import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toHaveLength,
  toContain,
} from "plgg-test";
import {
  el,
  text,
  div,
  svg,
  g,
  path,
  rect,
  circle,
  ellipse,
  line,
  polyline,
  polygon,
  button,
  span,
  ul,
  li,
  input,
  lazy,
  type SvgContent,
  type Flow,
  type Phrasing,
  type ListItem,
  type One,
  type NonEmpty,
} from "plgg-view/Html/model/element";
import { type Html } from "plgg-view/Html/model/Html";
import {
  class_,
  attr,
} from "plgg-view/Html/model/Attribute";
import { renderToString } from "plgg-view/Html/usecase/renderToString";

test("text builds a Text leaf", () =>
  check(
    text("hello"),
    toEqual({
      __tag: "Text",
      content: { value: "hello" },
    }),
  ));

test("el builds an Element with tag, attributes, children", () => {
  const node = el(
    "section",
    [class_("box")],
    [text("hi")],
  );
  return node.__tag === "Element"
    ? all([
        check(node.content.tag, toBe("section")),
        check(
          node.content.attributes,
          toHaveLength(1),
        ),
        check(
          node.content.children,
          toHaveLength(1),
        ),
      ])
    : check(node.__tag, toBe("Element"));
});

test("tag helpers set the tag name", () => {
  const b = button([], [text("ok")]);
  return all([
    check(div([], []).__tag, toBe("Element")),
    b.__tag === "Element"
      ? check(b.content.tag, toBe("button"))
      : check(b.__tag, toBe("Element")),
  ]);
});

test("ul/li build a list (content-model factories)", () => {
  const list = ul([], [li([], [text("x")])]);
  if (list.__tag !== "Element") {
    return check(list.__tag, toBe("Element"));
  }
  const [item] = list.content.children;
  return all([
    check(list.content.tag, toBe("ul")),
    item && item.__tag === "Element"
      ? check(item.content.tag, toBe("li"))
      : check("not-element", toBe("Element")),
  ]);
});

test("span (phrasing) and input (void) build", () => {
  const inp = input([class_("x")], []);
  return all([
    check(
      span([], [text("i")]).__tag,
      toBe("Element"),
    ),
    inp.__tag === "Element"
      ? all([
          check(inp.content.tag, toBe("input")),
          check(
            inp.content.children,
            toHaveLength(0),
          ),
        ])
      : check(inp.__tag, toBe("Element")),
  ]);
});

// --- type-level checks ----------------------------
// `@ts-expect-error` is banned, so negatives are
// proven as positive boolean assertions: `accept`
// compiles only when its argument resolves to
// `true`. A broken constraint flips the boolean and
// fails the build.

type IsAssignable<A, B> = [A] extends [B]
  ? true
  : false;

type Not<B extends boolean> = B extends true
  ? false
  : true;

const accept = <_Ok extends true>(): void => {};

test("content categories enforce which children fit", () => {
  // Positive — phrasing nests in phrasing and flow.
  accept<
    IsAssignable<
      Html<never, "span">,
      Phrasing<never>
    >
  >();
  accept<
    IsAssignable<Html<never, "span">, Flow<never>>
  >();
  accept<
    IsAssignable<Phrasing<never>, Flow<never>>
  >();
  accept<
    IsAssignable<
      Html<never, "li">,
      ListItem<never>
    >
  >();

  // Negative — wrong kind / wrong level is rejected.
  accept<
    Not<
      IsAssignable<
        Html<never, "div">,
        ListItem<never>
      >
    >
  >();
  accept<
    Not<
      IsAssignable<
        Html<never, "ul">,
        Phrasing<never>
      >
    >
  >();
  accept<
    Not<
      IsAssignable<Html<never, "li">, Flow<never>>
    >
  >();
  // A bare, un-branded component cannot enter a
  // strict slot — it must declare what it is.
  accept<
    Not<
      IsAssignable<Html<never>, ListItem<never>>
    >
  >();

  return check(true, toBe(true));
});

test("cardinality aliases pin arity", () => {
  accept<
    IsAssignable<
      readonly [Html<never, "li">],
      One<never, "li">
    >
  >();
  // exactly-one rejects two
  accept<
    Not<
      IsAssignable<
        readonly [
          Html<never, "li">,
          Html<never, "li">,
        ],
        One<never, "li">
      >
    >
  >();
  // non-empty rejects the empty tuple
  accept<
    Not<
      IsAssignable<
        readonly [],
        NonEmpty<never, "li">
      >
    >
  >();
  return check(true, toBe(true));
});

test("svg holds path drawings; d and viewBox render; color follows currentColor", () => {
  const icon = svg(
    [
      attr("viewBox", "0 0 24 24"),
      attr("fill", "currentColor"),
      attr("aria-hidden", "true"),
      class_("vp-sun"),
    ],
    [
      path(
        [attr("d", "M12 18a6 6 0 1 1 0-12z")],
        [],
      ),
    ],
  );
  const rendered = renderToString(icon);
  return all([
    check(
      rendered,
      toContain('<svg viewBox="0 0 24 24"'),
    ),
    check(
      rendered,
      toContain('fill="currentColor"'),
    ),
    check(
      rendered,
      toContain(
        '<path d="M12 18a6 6 0 1 1 0-12z"></path>',
      ),
    ),
    check(rendered, toContain("</svg>")),
  ]);
});

test("lazy builds a Lazy box without calling its producer", () => {
  let calls = 0;
  const row = (n: number) => {
    calls++;
    return div([], [text(String(n))]);
  };
  const node = lazy(row, 7);
  const a1 = check(node.__tag, toBe("Lazy"));
  if (node.__tag !== "Lazy") {
    return a1;
  }
  const a2 = check(node.content.arg, toBe(7));
  const a3 = check(calls, toBe(0));
  const a4 = check(node.content.fn, toBe(row));
  const resolved = node.content.render();
  return all([
    a1,
    a2,
    a3,
    a4,
    check(calls, toBe(1)),
    check(resolved, toEqual(div([], [text("7")]))),
  ]);
});

test("svg draws rect/circle/ellipse/line/polyline/polygon directly — no raw() wrapping needed", () => {
  const icon = svg(
    [attr("viewBox", "0 0 24 24")],
    [
      g(
        [attr("stroke", "currentColor")],
        [
          rect(
            [
              attr("x", "3"),
              attr("y", "3"),
              attr("width", "7"),
              attr("height", "9"),
            ],
            [],
          ),
          circle(
            [
              attr("cx", "12"),
              attr("cy", "12"),
              attr("r", "5"),
            ],
            [],
          ),
          ellipse(
            [
              attr("cx", "12"),
              attr("cy", "12"),
              attr("rx", "5"),
              attr("ry", "3"),
            ],
            [],
          ),
          line(
            [
              attr("x1", "0"),
              attr("y1", "0"),
              attr("x2", "10"),
              attr("y2", "10"),
            ],
            [],
          ),
          polyline(
            [attr("points", "0,0 10,10")],
            [],
          ),
          polygon(
            [attr("points", "0,0 10,0 5,10")],
            [],
          ),
        ],
      ),
    ],
  );
  const rendered = renderToString(icon);
  return all([
    check(
      rendered,
      toContain(
        '<rect x="3" y="3" width="7" height="9"></rect>',
      ),
    ),
    check(
      rendered,
      toContain(
        '<circle cx="12" cy="12" r="5"></circle>',
      ),
    ),
    check(
      rendered,
      toContain(
        '<ellipse cx="12" cy="12" rx="5" ry="3"></ellipse>',
      ),
    ),
    check(
      rendered,
      toContain(
        '<line x1="0" y1="0" x2="10" y2="10"></line>',
      ),
    ),
    check(
      rendered,
      toContain(
        '<polyline points="0,0 10,10"></polyline>',
      ),
    ),
    check(
      rendered,
      toContain(
        '<polygon points="0,0 10,0 5,10"></polygon>',
      ),
    ),
    check(
      rendered,
      toContain('<g stroke="currentColor">'),
    ),
  ]);
});

test("SVG content accepts every drawing and nested group, but excludes HTML children", () => {
  accept<
    IsAssignable<
      Html<
        never,
        | "path"
        | "rect"
        | "circle"
        | "ellipse"
        | "line"
        | "polyline"
        | "polygon"
        | "g"
      >,
      SvgContent<never>
    >
  >();
  accept<
    Not<
      IsAssignable<
        Html<never, "div">,
        SvgContent<never>
      >
    >
  >();
  accept<
    IsAssignable<
      ReadonlyArray<SvgContent<never>>,
      Parameters<typeof svg<never>>[1]
    >
  >();
  accept<
    IsAssignable<
      ReadonlyArray<SvgContent<never>>,
      Parameters<typeof g<never>>[1]
    >
  >();
  accept<
    Not<
      IsAssignable<
        ReadonlyArray<SvgContent<never>>,
        Parameters<typeof rect<never>>[1]
      >
    >
  >();
  accept<
    IsAssignable<
      Parameters<typeof rect<never>>[1],
      readonly []
    >
  >();
  accept<
    IsAssignable<
      Parameters<typeof circle<never>>[1],
      readonly []
    >
  >();
  accept<
    IsAssignable<
      Parameters<typeof ellipse<never>>[1],
      readonly []
    >
  >();
  accept<
    IsAssignable<
      Parameters<typeof line<never>>[1],
      readonly []
    >
  >();
  accept<
    IsAssignable<
      Parameters<typeof polyline<never>>[1],
      readonly []
    >
  >();
  accept<
    IsAssignable<
      Parameters<typeof polygon<never>>[1],
      readonly []
    >
  >();
  return check(true, toBe(true));
});
