// @vitest-environment happy-dom
import { test, expect } from "vitest";
import { jsx } from "plgg-view/jsx-runtime";
import { render } from "plgg-server/client";

test("mounts a VNode tree as real DOM", () => {
  const root = document.createElement("div");
  render(
    <ul class="x">
      <li>a</li>
      <li>b</li>
    </ul>,
    root,
  );
  expect(root.innerHTML).toBe(
    '<ul class="x"><li>a</li><li>b</li></ul>',
  );
});

test("replaces any existing children (takes over SSR markup)", () => {
  const root = document.createElement("div");
  root.innerHTML = "<span>old</span>";
  render(<p>new</p>, root);
  expect(root.innerHTML).toBe("<p>new</p>");
});

test("sets safe attributes and renders text/fragments", () => {
  const root = document.createElement("div");
  render(
    <>
      {"hi "}
      <a href="/x">there</a>
    </>,
    root,
  );
  expect(root.innerHTML).toBe('hi <a href="/x">there</a>');
});

test("drops unsafe attribute names", () => {
  const root = document.createElement("div");
  render(jsx("div", { "data-ok": "1", "bad name": "2" }), root);
  const child = root.firstElementChild;
  expect(child?.getAttribute("data-ok")).toBe("1");
  expect(child?.hasAttribute("bad name")).toBe(false);
});
