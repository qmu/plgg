// @plgg-test-environment dom
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  div,
  button,
  span,
  text,
} from "plgg-view/Html/model/element";
import { onClick } from "plgg-view/Html/model/Attribute";
import {
  sandbox,
  Sandbox,
} from "plgg-view/Program/usecase/sandbox";

// A minimal Elm-Architecture counter — the canonical sandbox.
type Model = number;
type Msg = "Increment" | "Decrement";

const counter: Sandbox<Model, Msg> = {
  init: 0,
  update: (msg, model) =>
    msg === "Increment" ? model + 1 : model - 1,
  view: (model) =>
    div(
      [],
      [
        button([onClick<Msg>("Decrement")], [
          text("-"),
        ]),
        span([], [text(String(model))]),
        button([onClick<Msg>("Increment")], [
          text("+"),
        ]),
      ],
    ),
};

const buttons = (root: Element) =>
  Array.from(root.querySelectorAll("button"));

test("sandbox renders the initial view", () => {
  const root = document.createElement("div");
  sandbox(counter)(root);
  return check(
    root.querySelector("span")?.textContent,
    toBe("0"),
  );
});

test("dispatching from a click updates the model and re-renders", () => {
  const root = document.createElement("div");
  sandbox(counter)(root);
  const [dec, inc] = buttons(root);
  inc?.dispatchEvent(new Event("click"));
  inc?.dispatchEvent(new Event("click"));
  const a1 = check(
    root.querySelector("span")?.textContent,
    toBe("2"),
  );
  dec?.dispatchEvent(new Event("click"));
  return all([
    a1,
    check(
      root.querySelector("span")?.textContent,
      toBe("1"),
    ),
  ]);
});

test("handlers survive re-render (full re-render re-wires them)", () => {
  const root = document.createElement("div");
  sandbox(counter)(root);
  // click the freshly-rendered button each time
  buttons(root)[1]?.dispatchEvent(
    new Event("click"),
  );
  buttons(root)[1]?.dispatchEvent(
    new Event("click"),
  );
  buttons(root)[1]?.dispatchEvent(
    new Event("click"),
  );
  return check(
    root.querySelector("span")?.textContent,
    toBe("3"),
  );
});

test("the cleanup function empties the container", () => {
  const root = document.createElement("div");
  const stop = sandbox(counter)(root);
  stop();
  return check(root.children.length, toBe(0));
});
