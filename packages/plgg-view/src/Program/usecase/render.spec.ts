// @vitest-environment happy-dom
import { test, expect } from "vitest";
import {
  el,
  text,
  button,
  input,
  form,
} from "plgg-view/Html/model/element";
import {
  attr,
  class_,
  onClick,
  onInput,
  onSubmit,
} from "plgg-view/Html/model/Attribute";
import { render } from "plgg-view/Program/usecase/render";

type Msg =
  | { kind: "Clicked" }
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

test("render builds DOM with text and safe attributes", () => {
  const root = document.createElement("div");
  render(
    el(
      "p",
      [class_("greeting")],
      [text("hi & bye")],
    ),
    root,
    () => {},
  );
  const p = root.firstElementChild;
  expect(p?.tagName).toBe("P");
  expect(p?.getAttribute("class")).toBe("greeting");
  expect(p?.textContent).toBe("hi & bye");
});

test("render drops attributes with unsafe names", () => {
  const root = document.createElement("div");
  render(
    el("div", [attr("bad name", "x")], []),
    root,
    () => {},
  );
  expect(
    root.firstElementChild?.hasAttribute("bad name"),
  ).toBe(false);
});

test("a click handler dispatches its Msg", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  render(
    button([onClick<Msg>({ kind: "Clicked" })], [
      text("Go"),
    ]),
    root,
    dispatch,
  );
  root.firstElementChild?.dispatchEvent(
    new Event("click"),
  );
  expect(msgs).toEqual([{ kind: "Clicked" }]);
});

test("an input handler dispatches with the target value", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  render(
    input(
      [
        onInput<Msg>((value) => ({
          kind: "Typed",
          value,
        })),
      ],
      [],
    ),
    root,
    dispatch,
  );
  const el0 = root.firstElementChild;
  if (el0 instanceof HTMLInputElement) {
    el0.value = "abc";
    el0.dispatchEvent(new Event("input"));
  }
  expect(msgs).toEqual([
    { kind: "Typed", value: "abc" },
  ]);
});

test("a submit handler prevents default and dispatches", () => {
  const root = document.createElement("div");
  const { msgs, dispatch } = collect();
  render(
    form([onSubmit<Msg>({ kind: "Submitted" })], []),
    root,
    dispatch,
  );
  const evt = new Event("submit", {
    cancelable: true,
  });
  root.firstElementChild?.dispatchEvent(evt);
  expect(evt.defaultPrevented).toBe(true);
  expect(msgs).toEqual([{ kind: "Submitted" }]);
});
