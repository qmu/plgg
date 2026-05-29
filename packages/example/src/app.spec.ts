// @vitest-environment happy-dom
import { test, expect } from "vitest";
import { renderToString } from "plgg-view/html";
import { sandbox } from "plgg-view/client";
import {
  init,
  update,
  view,
  app,
  Model,
} from "./app";

const seed: Model = {
  todos: [
    { id: 1, title: "Wire it", completed: false },
  ],
  draft: "",
  nextId: 2,
};

// --- pure update ---

test("DraftChanged sets the draft", () => {
  expect(
    update({ kind: "DraftChanged", value: "hi" }, init)
      .draft,
  ).toBe("hi");
});

test("Added appends a todo, clears the draft, and bumps nextId", () => {
  const next = update(
    { kind: "Added" },
    { ...init, draft: "Buy milk" },
  );
  expect(next.todos).toEqual([
    { id: 1, title: "Buy milk", completed: false },
  ]);
  expect(next.draft).toBe("");
  expect(next.nextId).toBe(2);
});

test("Added is a no-op for a blank draft", () => {
  expect(
    update({ kind: "Added" }, { ...init, draft: "   " }),
  ).toEqual({ ...init, draft: "   " });
});

test("Toggled flips the matching todo's completed flag", () => {
  expect(
    update({ kind: "Toggled", id: 1 }, seed).todos[0]
      ?.completed,
  ).toBe(true);
});

test("Deleted removes the matching todo", () => {
  expect(
    update({ kind: "Deleted", id: 1 }, seed).todos,
  ).toEqual([]);
});

// --- view (pure → HTML string) ---

test("view renders the title, the add form, and each todo", () => {
  const html = renderToString(view(seed));
  expect(html).toContain("plgg To-Do");
  expect(html).toContain('type="submit"');
  expect(html).toContain("Wire it");
});

// --- the running app (sandbox over the real DOM) ---

test("adding a todo through the form updates the list", () => {
  const root = document.createElement("div");
  sandbox(app)(root);

  const field = root.querySelector("input");
  if (field instanceof HTMLInputElement) {
    field.value = "Ship it";
    field.dispatchEvent(new Event("input"));
  }
  root
    .querySelector("form")
    ?.dispatchEvent(
      new Event("submit", { cancelable: true }),
    );

  expect(root.querySelectorAll("li.todo")).toHaveLength(
    1,
  );
  expect(root.textContent).toContain("Ship it");
});
