import { test, expect } from "vitest";
import { renderToString } from "plgg-view";
import { renderApp } from "./render";
import { TodoList, Todo } from "./components";

test("renders the page shell and remaining count", () => {
  const html = renderApp();
  expect(html).toContain('<main id="app">');
  expect(html).toContain("plgg-view todos");
  // two of three sample todos are not done
  expect(html).toContain("2 left");
  expect(html).toContain('built with plgg-view');
});

test("output is HTML-escaped by default (XSS-safe)", () => {
  const html = renderApp();
  // the sample label "Build a <component> & ship it"
  expect(html).toContain(
    "Build a &lt;component&gt; &amp; ship it",
  );
  expect(html).not.toContain("<component>");
});

test("list rendering: one <li> per todo", () => {
  const todos: ReadonlyArray<Todo> = [
    { id: "a", label: "first", done: false },
    { id: "b", label: "second", done: true },
  ];
  const html = renderToString(<TodoList todos={todos} />);
  expect(
    html.match(/<li class="todo/g)?.length,
  ).toBe(2);
  expect(html).toContain('<span class="label">first</span>');
});

test("conditional rendering: empty state", () => {
  expect(
    renderToString(<TodoList todos={[]} />),
  ).toBe('<p class="empty">Nothing to do yet.</p>');
});
