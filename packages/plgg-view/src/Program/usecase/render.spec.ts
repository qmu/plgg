// @vitest-environment happy-dom
import { test, expect } from "vitest";
import {
  el,
  text,
  div,
  span,
  button,
  input,
  form,
} from "plgg-view/Html/model/element";
import {
  attr,
  class_,
  type_,
  value_,
  onClick,
  onInput,
  onSubmit,
} from "plgg-view/Html/model/Attribute";
import { Html } from "plgg-view/Html/model/Html";
import { makeRenderer } from "plgg-view/Program/usecase/render";

type Msg =
  | { kind: "Clicked"; tag: string }
  | { kind: "Typed"; value: string }
  | { kind: "Submitted" };

const collect = () => {
  const msgs: Msg[] = [];
  return {
    msgs,
    dispatch: (m: Msg) => {
      msgs.push(m);
    },
  };
};

const noop = (): void => {};

// --- first paint ---------------------------------------------------------

test("first paint builds DOM with text and safe attributes", () => {
  const root = document.createElement("div");
  makeRenderer<never>(
    root,
    noop,
  )(el("p", [class_("greeting")], [text("hi & bye")]));
  const p = root.firstElementChild;
  expect(p?.tagName).toBe("P");
  expect(p?.getAttribute("class")).toBe("greeting");
  expect(p?.textContent).toBe("hi & bye");
});

test("attributes with unsafe names are dropped", () => {
  const root = document.createElement("div");
  makeRenderer<never>(
    root,
    noop,
  )(el("div", [attr("bad name", "x")], []));
  expect(
    root.firstElementChild?.hasAttribute("bad name"),
  ).toBe(false);
});

// --- handlers ------------------------------------------------------------

test("a click handler dispatches its Msg", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  makeRenderer<Msg>(
    root,
    dispatch,
  )(
    button(
      [onClick<Msg>({ kind: "Clicked", tag: "a" })],
      [text("Go")],
    ),
  );
  root.firstElementChild?.dispatchEvent(
    new Event("click"),
  );
  expect(msgs).toEqual([
    { kind: "Clicked", tag: "a" },
  ]);
});

test("an input handler dispatches with the target value", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  makeRenderer<Msg>(
    root,
    dispatch,
  )(
    input(
      [
        onInput<Msg>((value) => ({
          kind: "Typed",
          value,
        })),
      ],
      [],
    ),
  );
  const node = root.firstElementChild;
  if (node instanceof HTMLInputElement) {
    node.value = "abc";
    node.dispatchEvent(new Event("input"));
  }
  expect(msgs).toEqual([
    { kind: "Typed", value: "abc" },
  ]);
});

test("a submit handler prevents default and dispatches", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  makeRenderer<Msg>(
    root,
    dispatch,
  )(form([onSubmit<Msg>({ kind: "Submitted" })], []));
  const evt = new Event("submit", {
    cancelable: true,
  });
  root.firstElementChild?.dispatchEvent(evt);
  expect(evt.defaultPrevented).toBe(true);
  expect(msgs).toEqual([{ kind: "Submitted" }]);
});

test("a re-render re-points a handler without duplicating or going stale", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  const render = makeRenderer<Msg>(root, dispatch);
  render(
    button(
      [onClick<Msg>({ kind: "Clicked", tag: "a" })],
      [text("Go")],
    ),
  );
  const node = root.firstElementChild;
  node?.dispatchEvent(new Event("click"));
  // same node, new handler — one listener, re-pointed
  render(
    button(
      [onClick<Msg>({ kind: "Clicked", tag: "b" })],
      [text("Go")],
    ),
  );
  expect(root.firstElementChild).toBe(node);
  node?.dispatchEvent(new Event("click"));
  expect(msgs).toEqual([
    { kind: "Clicked", tag: "a" },
    { kind: "Clicked", tag: "b" },
  ]);
});

test("a dropped handler stops dispatching", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  const render = makeRenderer<Msg>(root, dispatch);
  render(
    button(
      [onClick<Msg>({ kind: "Clicked", tag: "a" })],
      [text("Go")],
    ),
  );
  const node = root.firstElementChild;
  render(button([], [text("Go")]));
  node?.dispatchEvent(new Event("click"));
  expect(msgs).toEqual([]);
});

// --- the reliability win: node reuse preserves focus ---------------------

test("re-render reuses the input node and preserves focus + caret", () => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const render = makeRenderer<Msg>(root, noop);
  const viewOf = (draft: string): Html<Msg> =>
    div(
      [],
      [
        input(
          [
            type_("text"),
            value_(draft),
            onInput<Msg>((value) => ({
              kind: "Typed",
              value,
            })),
          ],
          [],
        ),
      ],
    );
  render(viewOf(""));
  const first = root.querySelector("input");
  expect(first).toBeInstanceOf(HTMLInputElement);
  if (first instanceof HTMLInputElement) {
    first.focus();
    expect(document.activeElement).toBe(first);
    render(viewOf("ab"));
    // the SAME node is reused — a full re-render would have lost focus here
    expect(root.querySelector("input")).toBe(first);
    expect(document.activeElement).toBe(first);
    expect(first.value).toBe("ab");
  }
  document.body.removeChild(root);
});

// --- diffing internals ---------------------------------------------------

test("a text node is reused and only its data updated", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a")]));
  const textNode =
    root.firstElementChild?.firstChild;
  render(el("p", [], [text("b")]));
  expect(
    root.firstElementChild?.firstChild,
  ).toBe(textNode);
  expect(root.textContent).toBe("b");
});

test("a changed attribute is patched and a dropped one removed", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(
    el("div", [class_("a"), attr("id", "x")], []),
  );
  const node = root.firstElementChild;
  render(el("div", [class_("b")], []));
  expect(root.firstElementChild).toBe(node);
  expect(node?.getAttribute("class")).toBe("b");
  expect(node?.hasAttribute("id")).toBe(false);
});

test("a tag change replaces the node", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(div([], [text("x")]));
  const node = root.firstElementChild;
  render(span([], [text("x")]));
  const next = root.firstElementChild;
  expect(next).not.toBe(node);
  expect(next?.tagName).toBe("SPAN");
});

test("a text<->element swap replaces the node both ways", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("x")]));
  render(el("p", [], [div([], [])]));
  expect(
    root.firstElementChild?.firstElementChild
      ?.tagName,
  ).toBe("DIV");
  render(el("p", [], [text("y")]));
  expect(root.textContent).toBe("y");
});

test("children are appended and surplus removed", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("ul", [], [el("li", [], [text("1")])]));
  const ul = root.firstElementChild;
  render(
    el(
      "ul",
      [],
      [
        el("li", [], [text("1")]),
        el("li", [], [text("2")]),
      ],
    ),
  );
  expect(ul?.children.length).toBe(2);
  expect(ul?.children[1]?.textContent).toBe("2");
  render(el("ul", [], []));
  expect(ul?.children.length).toBe(0);
});

// --- controlled form properties (value / checked) ------------------------

test("the value property is driven so a reset clears the input", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(input([value_("hello")], []));
  const node = root.firstElementChild;
  expect(
    node instanceof HTMLInputElement && node.value,
  ).toBe("hello");
  render(input([value_("")], []));
  expect(
    node instanceof HTMLInputElement && node.value,
  ).toBe("");
});

test("removing the value attribute resets the property", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(input([value_("hello")], []));
  const node = root.firstElementChild;
  render(input([], []));
  expect(
    node instanceof HTMLInputElement && node.value,
  ).toBe("");
});

test("a textarea's value is also driven as a property", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("textarea", [value_("a")], []));
  const node = root.firstElementChild;
  expect(
    node instanceof HTMLTextAreaElement &&
      node.value,
  ).toBe("a");
  // re-render with the SAME value — the no-op guard skips the write
  render(el("textarea", [value_("a")], []));
  expect(
    node instanceof HTMLTextAreaElement &&
      node.value,
  ).toBe("a");
  render(el("textarea", [value_("b")], []));
  expect(
    node instanceof HTMLTextAreaElement &&
      node.value,
  ).toBe("b");
});

test("an already-checked box stays checked across a re-render", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  const checkbox = input(
    [type_("checkbox"), attr("checked", "")],
    [],
  );
  render(checkbox);
  const node = root.firstElementChild;
  render(checkbox); // checked already true — the guard skips the write
  expect(
    node instanceof HTMLInputElement &&
      node.checked,
  ).toBe(true);
});

test("the checked property toggles with the attribute's presence", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(
    input(
      [type_("checkbox"), attr("checked", "")],
      [],
    ),
  );
  const node = root.firstElementChild;
  expect(
    node instanceof HTMLInputElement &&
      node.checked,
  ).toBe(true);
  render(input([type_("checkbox")], []));
  expect(
    node instanceof HTMLInputElement &&
      node.checked,
  ).toBe(false);
});

// --- robustness: tolerate DOM drift --------------------------------------

test("rebuilds when the container was externally emptied", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a")]));
  root.replaceChildren(); // external clear between renders
  render(el("p", [], [text("b")]));
  expect(root.textContent).toBe("b");
});

test("replaces when the DOM node drifted from the old vnode kind", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("p", [], [text("a")]));
  const p = root.firstElementChild;
  // swap the child text node for an element behind the renderer's back
  p?.replaceChildren(document.createElement("b"));
  render(el("p", [], [text("c")]));
  expect(p?.textContent).toBe("c");
});

test("tolerates externally-added child nodes when growing a list", () => {
  const root = document.createElement("div");
  const render = makeRenderer<never>(root, noop);
  render(el("ul", [], [el("li", [], [text("1")])]));
  const ul = root.firstElementChild;
  ul?.appendChild(document.createElement("li")); // external node
  render(
    el(
      "ul",
      [],
      [
        el("li", [], [text("1")]),
        el("li", [], [text("2")]),
      ],
    ),
  );
  expect(
    (ul?.querySelectorAll("li").length ?? 0) >= 2,
  ).toBe(true);
});
