import { test, expect } from "vitest";
import { VNode } from "plgg-view";
import { App } from "./App";
import { TodoList, Todo } from "./components";

/**
 * Consuming the view tree: collect every Text value, in order. This is the kind
 * of thing a downstream renderer (or these tests) does with the plgg data.
 */
const texts = (node: VNode): ReadonlyArray<string> =>
  node.__tag === "Text"
    ? [node.content.value]
    : node.content.children.flatMap(texts);

test("App processes .tsx into a <main> view tree", () => {
  const view = App();
  expect(view.__tag).toBe("Element");
  if (view.__tag === "Element") {
    expect(view.content.tag).toBe("main");
    expect(view.content.props).toEqual({ id: "app" });
  }
});

test("the rendered text reflects props and composition", () => {
  const all = texts(App()).join("");
  expect(all).toContain("plgg-view todos");
  expect(all).toContain("2 left"); // 2 of 3 sample todos not done
  expect(all).toContain("built with plgg-view");
});

test("text is kept raw in the data (no HTML escaping here)", () => {
  // the sample label literally contains < > &
  expect(texts(App())).toContain("Build a <component> & ship it");
});

test("list rendering: one <li> per todo", () => {
  const todos: ReadonlyArray<Todo> = [
    { id: "a", label: "first", done: false },
    { id: "b", label: "second", done: true },
  ];
  const view: VNode = <TodoList todos={todos} />;
  expect(view.__tag).toBe("Element");
  if (view.__tag === "Element") {
    expect(view.content.tag).toBe("ul");
    expect(view.content.children.length).toBe(2);
    expect(texts(view)).toEqual([
      "○",
      "first",
      "✓",
      "second",
    ]);
  }
});

test("conditional rendering: empty state is a <p>", () => {
  const view: VNode = <TodoList todos={[]} />;
  expect(view.__tag).toBe("Element");
  if (view.__tag === "Element") {
    expect(view.content.tag).toBe("p");
    expect(view.content.props).toEqual({ class: "empty" });
    expect(texts(view)).toEqual(["Nothing to do yet."]);
  }
});
