// @plgg-test-environment dom
//
// Demo 1's runnable proof, driven in the in-house DOM: the
// raw combinators render real nav/main/aside landmark
// panes; collapsing a pane omits its column from the row;
// cycling the nav width relabels the control. The geometry
// is the alignment system's, composed by hand.
import {
  test,
  check,
  all,
  toBe,
  toContain,
  beforeEach,
  afterEach,
} from "plgg-test";
import { sandbox } from "plgg-view/client";
import { program } from "./paneAlignmentDemo.ts";

let stop: () => void = () => {};

const mount = (): Element => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = sandbox(program)(root);
  return root;
};

const click = (t: EventTarget): void =>
  void t.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );

const clickBtn = (
  root: Element,
  txt: string,
): void => {
  const el = Array.from(
    root.querySelectorAll(".pm-btn"),
  ).find((n: Element) =>
    (n.textContent ?? "").includes(txt),
  );
  if (el !== undefined) {
    click(el);
  }
};

const cols = (root: Element): number =>
  root.querySelectorAll(".pm-col").length;

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  stop();
});

test("renders the three landmark panes and the controls", () => {
  const root = mount();
  return all([
    check(
      root.querySelector("nav") !== null,
      toBe(true),
    ),
    check(
      root.querySelector("main") !== null,
      toBe(true),
    ),
    check(
      root.querySelector("aside") !== null,
      toBe(true),
    ),
    check(cols(root), toBe(3)),
    check(
      root.textContent,
      toContain("Collapse nav"),
    ),
  ]);
});

test("collapsing the nav omits its column; showing it restores", () => {
  const root = mount();
  clickBtn(root, "Collapse nav");
  const collapsed =
    root.querySelector("nav") === null &&
    cols(root) === 2;
  clickBtn(root, "Show nav");
  const restored =
    root.querySelector("nav") !== null &&
    cols(root) === 3;
  return all([
    check(collapsed, toBe(true)),
    check(restored, toBe(true)),
  ]);
});

test("collapsing the aside omits its column", () => {
  const root = mount();
  clickBtn(root, "Collapse aside");
  return all([
    check(
      root.querySelector("aside") === null,
      toBe(true),
    ),
    check(cols(root), toBe(2)),
  ]);
});

test("cycling the nav width relabels: narrow to wide to fluid", () => {
  const root = mount();
  const start = root.textContent ?? "";
  clickBtn(root, "Nav width");
  const afterOne = root.textContent ?? "";
  clickBtn(root, "Nav width");
  const afterTwo = root.textContent ?? "";
  return all([
    check(start, toContain("narrow")),
    check(afterOne, toContain("wide")),
    check(afterTwo, toContain("fluid")),
  ]);
});
