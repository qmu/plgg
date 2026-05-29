import { test, expect } from "vitest";
import { box } from "plgg";
import { VNode } from "plgg-view/index";

const text = (value: string) => box("Text")({ value });

// A function component is just `(props) => VNode`. The runtime resolves it away
// into the host tree, so its output is indistinguishable from inline markup.
const Greeting = (props: { name: string }): VNode => (
  <p class="greet">Hello, {props.name}!</p>
);

test("an intrinsic element becomes an Element node", () => {
  const v: VNode = <a href="/x">go</a>;
  expect(v).toEqual(
    box("Element")({
      tag: "a",
      props: { href: "/x" },
      children: [text("go")],
    }),
  );
});

test("jsxs path: multiple static children land in order", () => {
  const v: VNode = (
    <ul>
      <li>a</li>
      <li>b</li>
    </ul>
  );
  expect(v.__tag).toBe("Element");
  if (v.__tag === "Element") {
    expect(v.content.tag).toBe("ul");
    expect(v.content.children).toEqual([
      box("Element")({ tag: "li", props: {}, children: [text("a")] }),
      box("Element")({ tag: "li", props: {}, children: [text("b")] }),
    ]);
  }
});

test("a fragment becomes a Fragment node with no tag", () => {
  const v: VNode = (
    <>
      <span>a</span>
      <span>b</span>
    </>
  );
  expect(v.__tag).toBe("Fragment");
  if (v.__tag === "Fragment") {
    expect(v.content.children.length).toBe(2);
  }
});

test("a function component is resolved into its returned tree", () => {
  expect(<Greeting name="Ada" />).toEqual(
    box("Element")({
      tag: "p",
      props: { class: "greet" },
      children: [text("Hello, "), text("Ada"), text("!")],
    }),
  );
});

test("prop coercion: numbers stringify, true is bare, false drops", () => {
  const v: VNode = (
    <input tabindex={3} disabled={true} hidden={false} />
  );
  if (v.__tag === "Element") {
    expect(v.content.props).toEqual({ tabindex: "3", disabled: "" });
  }
});

test("falsey children drop so `cond && <x/>` works", () => {
  const show = false;
  const v: VNode = <div>{show && <b>secret</b>}kept</div>;
  if (v.__tag === "Element") {
    expect(v.content.children).toEqual([text("kept")]);
  }
});
