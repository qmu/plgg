// @vitest-environment happy-dom
import { test, expect } from "vitest";
import { isOk } from "plgg";
import { renderToString } from "plgg-server";
import { render } from "plgg-server/client";
import { App } from "./App";
import { asTodos } from "../models/Todo";

// The same data-driven App, rendered two ways — proving the tree is
// isomorphic. The seed includes one completed item (with completedAt) and one
// open item, so both branches of the Option<Time> render path are exercised.
const RAW = [
  {
    id: "t1",
    title: "Wire the pipeline",
    completed: true,
    createdAt: "2026-05-26T09:00:00Z",
    completedAt: "2026-05-27T18:30:00Z",
  },
  {
    id: "t2",
    title: "Ship the demo",
    completed: false,
    createdAt: "2026-05-28T09:00:00Z",
  },
];

test("App SSR renders the title, both rows, the done class, and the open meta", () => {
  const decoded = asTodos(RAW);
  expect(isOk(decoded)).toBe(true);
  if (isOk(decoded)) {
    const html = renderToString(
      App({ todos: decoded.content }),
    );
    expect(html).toContain("plgg To-Do");
    expect(html).toContain("Wire the pipeline");
    expect(html).toContain("Ship the demo");
    // Completed row carries the done class:
    expect(html).toContain('class="todo done"');
    // Open row carries the bare "todo" class (without "done"):
    expect(html).toContain('class="todo"');
    // The open-state meta block is present:
    expect(html).toContain(">open<");
  }
});

test("App CSR renders the same content into a happy-dom container", () => {
  const decoded = asTodos(RAW);
  if (isOk(decoded)) {
    const root = document.createElement("div");
    render(App({ todos: decoded.content }), root);
    const html = root.innerHTML;
    expect(html).toContain("Wire the pipeline");
    expect(html).toContain("Ship the demo");
    expect(html).toContain('class="todo done"');
  }
});

test("App SSR renders the add-form with the create action wired", () => {
  const decoded = asTodos([]);
  if (isOk(decoded)) {
    const html = renderToString(
      App({ todos: decoded.content }),
    );
    expect(html).toContain(
      'data-action="create"',
    );
    expect(html).toContain('name="title"');
    expect(html).toContain(
      'method="POST"',
    );
    expect(html).toContain(
      'action="/api/todos"',
    );
  }
});
