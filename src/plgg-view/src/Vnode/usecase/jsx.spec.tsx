import { test, expect } from "vitest";
import { renderToString, VNode } from "plgg-view/index";

// A function component is just `(props) => VNode`. Composition is ordinary
// function application; there is no base class, no hooks.
const Greeting = (props: { name: string }): VNode => (
  <p class="greet">Hello, {props.name}!</p>
);

test("intrinsic element with attributes and text child", () => {
  expect(renderToString(<a href="/x">go</a>)).toBe(
    '<a href="/x">go</a>',
  );
});

test("jsxs path: an element with multiple static children", () => {
  expect(
    renderToString(
      <ul>
        <li>a</li>
        <li>b</li>
      </ul>,
    ),
  ).toBe("<ul><li>a</li><li>b</li></ul>");
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

test("function component composes and renders", () => {
  expect(renderToString(<Greeting name="Ada" />)).toBe(
    '<p class="greet">Hello, Ada!</p>',
  );
});

test("number props stringify, true is a bare attribute, false drops", () => {
  expect(
    renderToString(
      <input tabindex={3} disabled={true} hidden={false} />,
    ),
  ).toBe('<input tabindex="3" disabled="" />');
});

test("falsey children drop so `cond && <x/>` works", () => {
  const show = false;
  expect(
    renderToString(
      <div>{show && <b>secret</b>}kept</div>,
    ),
  ).toBe("<div>kept</div>");
});
