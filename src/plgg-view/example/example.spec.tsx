import { test, expect } from "vitest";
import { VNode } from "plgg-view/index";
import { Greeting, Badge, Card, Menu, Notice } from "./index";

/** Collect every Text value in the tree, in order. */
const texts = (node: VNode): ReadonlyArray<string> =>
  node.__tag === "Text"
    ? [node.content.value]
    : node.content.children.flatMap(texts);

test("Greeting interpolates text around a nested element", () => {
  const v: VNode = <Greeting name="Ada" />;
  expect(v.__tag === "Element" && v.content.tag).toBe("p");
  expect(texts(v)).toEqual(["Hello, ", "Ada", "!"]);
});

test("Badge coerces number/boolean props to attributes", () => {
  const shown: VNode = <Badge count={3} muted={false} />;
  if (shown.__tag === "Element") {
    expect(shown.content.props).toEqual({
      class: "badge",
      "data-count": "3",
    });
    expect(texts(shown)).toEqual(["3"]);
  }
  const hidden: VNode = <Badge count={0} muted={true} />;
  if (hidden.__tag === "Element") {
    expect(hidden.content.props["aria-hidden"]).toBe("");
  }
});

test("Card places nested children in its body slot", () => {
  const v: VNode = (
    <Card title="Hi">
      <p>inner</p>
    </Card>
  );
  expect(texts(v)).toEqual(["Hi", "inner"]);
});

test("Menu is a fragment with a heading and a list", () => {
  const v: VNode = (
    <Menu
      title="Site"
      links={[
        { href: "/a", label: "A" },
        { href: "/b", label: "B" },
      ]}
    />
  );
  expect(v.__tag).toBe("Fragment");
  expect(texts(v)).toEqual(["Site", "A", "B"]);
});

test("Notice drops the marker unless urgent", () => {
  expect(texts(<Notice message="hi" urgent={false} />)).toEqual([
    "hi",
  ]);
  expect(texts(<Notice message="hi" urgent={true} />)).toEqual([
    "!",
    "hi",
  ]);
});
