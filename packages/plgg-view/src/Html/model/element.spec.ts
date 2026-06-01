import { test, expect } from "vitest";
import {
  el,
  text,
  div,
  button,
  span,
  ul,
  li,
  input,
  type Flow,
  type Phrasing,
  type ListItem,
  type One,
  type NonEmpty,
} from "plgg-view/Html/model/element";
import { type Html } from "plgg-view/Html/model/Html";
import { class_ } from "plgg-view/Html/model/Attribute";

test("text builds a Text leaf", () => {
  expect(text("hello")).toEqual({
    __tag: "Text",
    content: { value: "hello" },
  });
});

test("el builds an Element with tag, attributes, children", () => {
  const node = el(
    "section",
    [class_("box")],
    [text("hi")],
  );
  expect(node.__tag).toBe("Element");
  if (node.__tag === "Element") {
    expect(node.content.tag).toBe("section");
    expect(node.content.attributes).toHaveLength(
      1,
    );
    expect(node.content.children).toHaveLength(1);
  }
});

test("tag helpers set the tag name", () => {
  expect(div([], []).__tag).toBe("Element");
  const b = button([], [text("ok")]);
  if (b.__tag === "Element") {
    expect(b.content.tag).toBe("button");
  }
});

test("ul/li build a list (content-model factories)", () => {
  const list = ul([], [li([], [text("x")])]);
  expect(list.__tag).toBe("Element");
  if (list.__tag === "Element") {
    expect(list.content.tag).toBe("ul");
    const [item] = list.content.children;
    if (item && item.__tag === "Element") {
      expect(item.content.tag).toBe("li");
    }
  }
});

test("span (phrasing) and input (void) build", () => {
  expect(span([], [text("i")]).__tag).toBe(
    "Element",
  );
  const inp = input([class_("x")], []);
  if (inp.__tag === "Element") {
    expect(inp.content.tag).toBe("input");
    expect(inp.content.children).toHaveLength(0);
  }
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

  expect(true).toBe(true);
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
  expect(true).toBe(true);
});
