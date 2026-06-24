// @vitest-environment happy-dom
import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  toHaveLength,
  toBeNull,
  not,
} from "plgg-test";
import { renderToString } from "plgg-view";
import { application } from "plgg-view/client";
import { pageResponse } from "plgg-server";
import {
  init,
  update,
  view,
  app,
  Model,
} from "./app.js";

const seed: Model = {
  todos: [
    { id: 1, title: "Wire it", completed: false },
  ],
  draft: "",
  nextId: 2,
  filter: "all",
  q: "",
  toasts: [],
  toastSeq: 1,
  expanded: [],
  confirmClear: false,
};

// --- pure update ---

test("DraftChanged sets the draft", () =>
  check(
    update(
      { kind: "DraftChanged", value: "hi" },
      init,
    ).draft,
    toBe("hi"),
  ));

test("Added appends a todo, clears the draft, and bumps nextId", () => {
  const next = update(
    { kind: "Added" },
    { ...init, draft: "Buy milk" },
  );
  return all([
    check(next.todos, toEqual([
      {
        id: 1,
        title: "Buy milk",
        completed: false,
      },
    ])),
    check(next.draft, toBe("")),
    check(next.nextId, toBe(2)),
  ]);
});

test("Added is a no-op for a blank draft", () =>
  check(
    update(
      { kind: "Added" },
      { ...init, draft: "   " },
    ),
    toEqual({ ...init, draft: "   " }),
  ));

test("Toggled flips the matching todo's completed flag", () =>
  check(
    update({ kind: "Toggled", id: 1 }, seed)
      .todos[0]?.completed,
    toBe(true),
  ));

test("Deleted removes the matching todo", () =>
  check(
    update({ kind: "Deleted", id: 1 }, seed).todos,
    toEqual([]),
  ));

// --- view (pure → HTML string) ---

test("view renders the title, the add form, and each todo", () => {
  const html = renderToString(view(seed));
  return all([
    check(html, toContain("Things to do")),
    check(html, toContain('type="submit"')),
    check(html, toContain("Wire it")),
  ]);
});

// --- SSR: the same view through plgg-server (Html → full document) ---

test("SSR pageResponse wraps view(init) in a document and injects the client entry", () => {
  const r = pageResponse({
    title: "plgg To-Do — SSR + CSR",
    root: view(init),
    clientEntry: "/main.js",
  });
  const body =
    typeof r.body === "string" ? r.body : "";
  return all([
    check(
      r.headers["content-type"],
      toBe("text/html; charset=utf-8"),
    ),
    // the body is the same markup the client's `view(init)` produces, wrapped in
    // a document with the #root mount point and the CSR boot script
    check(body, toContain("<!doctype html>")),
    check(body, toContain('<div id="root">')),
    check(body, toContain("plgg To-Do")),
    check(
      body,
      toContain(
        '<script type="module" src="/main.js">',
      ),
    ),
  ]);
});

// --- the running app (application over the real DOM) ---

test("adding a todo through the form updates the list", () => {
  window.history.replaceState(null, "", "/");
  const root = document.createElement("div");
  const stop = application(app)(root);

  const field = root.querySelector(
    "input[name=title]",
  );
  if (field instanceof HTMLInputElement) {
    field.value = "Ship it";
    field.dispatchEvent(new Event("input"));
  }
  root
    .querySelector("form")
    ?.dispatchEvent(
      new Event("submit", { cancelable: true }),
    );

  const a1 = check(
    Array.from(root.querySelectorAll("li.todo")),
    toHaveLength(1),
  );
  const a2 = check(
    root.textContent ?? "",
    toContain("Ship it"),
  );
  stop();
  return all([a1, a2]);
});

// --- pure update: the URL-reflected slice ---

test("FilterChanged and SearchChanged fold into the model", () =>
  all([
    check(
      update(
        {
          kind: "FilterChanged",
          filter: "active",
        },
        init,
      ).filter,
      toBe("active"),
    ),
    check(
      update(
        { kind: "SearchChanged", value: "milk" },
        init,
      ).q,
      toBe("milk"),
    ),
  ]));

test("UrlChanged seeds filter and q together (a deep link / back-forward)", () => {
  const next = update(
    {
      kind: "UrlChanged",
      filter: "completed",
      q: "buy",
    },
    init,
  );
  return all([
    check(next.filter, toBe("completed")),
    check(next.q, toBe("buy")),
  ]);
});

test("the view shows only todos matching the filter and search", () => {
  const model: Model = {
    todos: [
      {
        id: 1,
        title: "Buy milk",
        completed: false,
      },
      {
        id: 2,
        title: "Buy eggs",
        completed: true,
      },
      {
        id: 3,
        title: "Call mom",
        completed: false,
      },
    ],
    draft: "",
    nextId: 4,
    filter: "active",
    q: "buy",
    toasts: [],
    toastSeq: 1,
    expanded: [],
    confirmClear: false,
  };
  const html = renderToString(view(model));
  return all([
    check(html, toContain("Buy milk")), // active + matches "buy"
    check(html, not(toContain("Buy eggs"))), // completed, filtered out
    check(html, not(toContain("Call mom"))), // active but no "buy"
  ]);
});

// --- the running app: model state is reflected into the URL ---

test("clicking a filter pushes the reflected query to the address bar", () => {
  window.history.replaceState(null, "", "/");
  const root = document.createElement("div");
  const stop = application(app)(root);

  const activeButton = Array.from(
    root.querySelectorAll(".todo-filters button"),
  ).find((el) => el.textContent === "active");
  activeButton?.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );

  const verdict = check(
    window.location.search,
    toBe("?filter=active"),
  );
  stop();
  return verdict;
});

test("the app seeds its filter from the entry query (deep link)", () => {
  window.history.replaceState(
    null,
    "",
    "/?filter=completed",
  );
  const root = document.createElement("div");
  const stop = application(app)(root);
  // the completed filter is reflected as selected in the rendered toolbar
  const selected = root.querySelector(
    ".todo-filters button.filter.selected",
  );
  const verdict = check(
    selected?.textContent ?? "",
    toBe("completed"),
  );
  stop();
  return verdict;
});

test("typing in search reflects q to the URL with replace", () => {
  window.history.replaceState(null, "", "/");
  const root = document.createElement("div");
  const stop = application(app)(root);
  const search = root.querySelector(
    "input[name=q]",
  );
  if (search instanceof HTMLInputElement) {
    search.value = "milk";
    search.dispatchEvent(new Event("input"));
  }
  const verdict = check(
    window.location.search,
    toBe("?q=milk"),
  );
  stop();
  return verdict;
});

test("popstate navigation updates the filter from the URL", () => {
  window.history.replaceState(
    null,
    "",
    "/?filter=active",
  );
  const root = document.createElement("div");
  const stop = application(app)(root);
  window.history.replaceState(
    null,
    "",
    "/?filter=completed",
  );
  window.dispatchEvent(new Event("popstate"));
  const selected = root.querySelector(
    ".todo-filters button.filter.selected",
  );
  const verdict = check(
    selected?.textContent ?? "",
    toBe("completed"),
  );
  stop();
  return verdict;
});

test("toggling a todo's checkbox flips it in the running app", () => {
  window.history.replaceState(null, "", "/");
  const root = document.createElement("div");
  const stop = application(app)(root);
  const field = root.querySelector(
    "input[name=title]",
  );
  if (field instanceof HTMLInputElement) {
    field.value = "Toggle me";
    field.dispatchEvent(new Event("input"));
  }
  root
    .querySelector("form")
    ?.dispatchEvent(
      new Event("submit", { cancelable: true }),
    );
  const box = root.querySelector(
    "li.todo input[type=checkbox]",
  );
  box?.dispatchEvent(new Event("change"));
  const verdict = check(
    root.querySelector("li.todo.done"),
    not(toBeNull()),
  );
  stop();
  return verdict;
});

test("a completed todo renders with a checked box", () => {
  const model: Model = {
    todos: [
      { id: 1, title: "Done", completed: true },
    ],
    draft: "",
    nextId: 2,
    filter: "all",
    q: "",
    toasts: [],
    toastSeq: 1,
    expanded: [],
    confirmClear: false,
  };
  const html = renderToString(view(model));
  return all([
    check(html, toContain("checked")),
    check(html, toContain("Done")),
  ]);
});

// --- micro-interactions: toaster / accordion / modal (pure update + view) ---

test("Added pushes a success toast and bumps toastSeq", () => {
  const next = update(
    { kind: "Added" },
    { ...init, draft: "Buy milk" },
  );
  return all([
    check(next.toasts, toHaveLength(1)),
    check(next.toasts[0]?.tone, toBe("success")),
    check(
      next.toasts[0]?.message ?? "",
      toContain("Buy milk"),
    ),
    check(next.toastSeq, toBe(2)),
  ]);
});

test("Deleted pushes a danger toast and drops the id from expanded", () => {
  const next = update(
    { kind: "Deleted", id: 1 },
    { ...seed, expanded: [1] },
  );
  return all([
    check(next.toasts[0]?.tone, toBe("danger")),
    check(next.expanded, toEqual([])),
  ]);
});

test("ToastDismissed removes the matching toast", () => {
  const withToast = update(
    { kind: "Added" },
    { ...init, draft: "x" },
  );
  const id = withToast.toasts[0]?.id ?? -1;
  return check(
    update(
      { kind: "ToastDismissed", id },
      withToast,
    ).toasts,
    toEqual([]),
  );
});

test("Moved swaps a todo with its neighbour and is a no-op at the edges", () => {
  const three: Model = {
    ...seed,
    todos: [
      { id: 1, title: "a", completed: false },
      { id: 2, title: "b", completed: false },
      { id: 3, title: "c", completed: false },
    ],
  };
  return all([
    check(
      update(
        { kind: "Moved", id: 2, delta: -1 },
        three,
      ).todos.map((t) => t.id),
      toEqual([2, 1, 3]),
    ),
    check(
      update(
        { kind: "Moved", id: 3, delta: 1 },
        three,
      ).todos.map((t) => t.id),
      toEqual([1, 2, 3]),
    ),
    check(
      update(
        { kind: "Moved", id: 1, delta: -1 },
        three,
      ).todos.map((t) => t.id),
      toEqual([1, 2, 3]),
    ),
  ]);
});

test("ExpandToggled adds then removes a todo id (accordion)", () => {
  const open = update(
    { kind: "ExpandToggled", id: 1 },
    seed,
  );
  return all([
    check(open.expanded, toEqual([1])),
    check(
      update({ kind: "ExpandToggled", id: 1 }, open)
        .expanded,
      toEqual([]),
    ),
  ]);
});

test("the clear-completed modal flow opens, cancels, and confirms", () => {
  const base: Model = {
    ...seed,
    todos: [
      { id: 1, title: "a", completed: true },
      { id: 2, title: "b", completed: false },
    ],
  };
  const cleared = update(
    { kind: "ClearConfirmed" },
    { ...base, confirmClear: true },
  );
  return all([
    check(
      update({ kind: "ClearRequested" }, base)
        .confirmClear,
      toBe(true),
    ),
    check(
      update(
        { kind: "ClearCancelled" },
        { ...base, confirmClear: true },
      ).confirmClear,
      toBe(false),
    ),
    check(cleared.todos, toEqual([
      { id: 2, title: "b", completed: false },
    ])),
    check(cleared.confirmClear, toBe(false)),
    check(
      cleared.toasts[0]?.message ?? "",
      toContain("1 completed"),
    ),
  ]);
});

test("an open accordion renders the details panel; the modal renders when confirming", () => {
  const open = renderToString(
    view({ ...seed, expanded: [1] }),
  );
  const modal = renderToString(
    view({ ...seed, confirmClear: true }),
  );
  return all([
    check(open, toContain("todo-details")),
    check(
      open,
      toContain("click the title again"),
    ),
    check(modal, toContain("modal-backdrop")),
    check(modal, toContain("Clear completed?")),
  ]);
});

test("a toast in the model renders in the toaster stack", () => {
  const html = renderToString(
    view({
      ...seed,
      toasts: [
        {
          id: 1,
          tone: "success",
          message: "Saved",
        },
      ],
    }),
  );
  return all([
    check(html, toContain("toaster")),
    check(html, toContain("Saved")),
  ]);
});
