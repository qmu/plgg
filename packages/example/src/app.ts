import { SoftStr, fromNullable } from "plgg";
import {
  Application,
  makeUrl,
} from "plgg-view/client";
import {
  Html,
  div,
  header,
  h1,
  p,
  form,
  input,
  button,
  ul,
  li,
  span,
  text,
  attr,
  class_,
  type_,
  value_,
  name_,
  onInput,
  onSubmit,
  onClick,
  onChange,
  fadeIn,
  fadeOut,
} from "plgg-view";
import {
  QueryCodec,
  parseQuery,
  serializeQuery,
  queryEnum,
  queryStr,
  writeField,
} from "plgg-router";
import { Todo } from "./Todo";

/** Which todos the list shows — reflected to the URL as `?filter=…`. */
export type Filter =
  | "all"
  | "active"
  | "completed";

/**
 * The whole app state as one immutable value: the todo list, the add-form draft,
 * the next id to assign, and the URL-reflected view state (`filter` + the search
 * `q`). Keeping `filter`/`q` in the Model is what lets the runtime *project* them
 * into the address bar (nuqs-style) with no imperative URL setter.
 */
export type Model = Readonly<{
  todos: ReadonlyArray<Todo>;
  draft: SoftStr;
  nextId: number;
  filter: Filter;
  q: SoftStr;
}>;

/** Everything that can happen, as data. */
export type Msg =
  | Readonly<{
      kind: "DraftChanged";
      value: SoftStr;
    }>
  | Readonly<{ kind: "Added" }>
  | Readonly<{ kind: "Toggled"; id: number }>
  | Readonly<{ kind: "Deleted"; id: number }>
  | Readonly<{
      kind: "FilterChanged";
      filter: Filter;
    }>
  | Readonly<{
      kind: "SearchChanged";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "UrlChanged";
      filter: Filter;
      q: SoftStr;
    }>;

export const init: Model = {
  todos: [],
  draft: "",
  nextId: 1,
  filter: "all",
  q: "",
};

/**
 * Pure state transition: a `Msg` and the old `Model` in, the new `Model` out.
 * No DOM, no effects — trivially unit-testable. The URL-reflected `filter`/`q`
 * are folded in here too, including the `UrlChanged` message the runtime sends
 * when the user navigates (back/forward / a shared deep link).
 */
export const update = (
  msg: Msg,
  model: Model,
): Model =>
  msg.kind === "FilterChanged"
    ? { ...model, filter: msg.filter }
    : msg.kind === "SearchChanged"
      ? { ...model, q: msg.value }
      : msg.kind === "UrlChanged"
        ? {
            ...model,
            filter: msg.filter,
            q: msg.q,
          }
        : msg.kind === "DraftChanged"
          ? { ...model, draft: msg.value }
          : msg.kind === "Added"
            ? model.draft.trim().length === 0
              ? model
              : {
                  ...model,
                  todos: [
                    ...model.todos,
                    {
                      id: model.nextId,
                      title: model.draft.trim(),
                      completed: false,
                    },
                  ],
                  draft: "",
                  nextId: model.nextId + 1,
                }
            : msg.kind === "Toggled"
              ? {
                  ...model,
                  todos: model.todos.map(
                    (todo) =>
                      todo.id === msg.id
                        ? {
                            ...todo,
                            completed:
                              !todo.completed,
                          }
                        : todo,
                  ),
                }
              : {
                  ...model,
                  todos: model.todos.filter(
                    (todo) => todo.id !== msg.id,
                  ),
                };

/** Whether a todo passes the active filter. */
const matchesFilter = (
  filter: Filter,
  todo: Todo,
): boolean =>
  filter === "all"
    ? true
    : filter === "active"
      ? !todo.completed
      : todo.completed;

/** The todos the current `filter` + search `q` keep visible. */
const visibleTodos = (
  model: Model,
): ReadonlyArray<Todo> =>
  model.todos.filter(
    (todo) =>
      matchesFilter(model.filter, todo) &&
      todo.title
        .toLowerCase()
        .includes(model.q.toLowerCase()),
  );

const FILTERS: ReadonlyArray<Filter> = [
  "all",
  "active",
  "completed",
];

// Returns `Html<Msg, "div">` (not the bare `Html<Msg>`) so it drops into the
// flow-content toolbar below — a bare `Html<Msg>` would be a compile error.
const viewFilters = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [class_("todo-filters")],
    FILTERS.map((filter) =>
      button(
        [
          class_(
            model.filter === filter
              ? "filter selected"
              : "filter",
          ),
          onClick<Msg>({
            kind: "FilterChanged",
            filter,
          }),
        ],
        [text(filter)],
      ),
    ),
  );

// The return type is the narrowed `Html<Msg, "li">`, not the bare `Html<Msg>`:
// that is what lets `viewTodo` drop into `ul`'s `li`-only children slot below.
const viewTodo = (todo: Todo): Html<Msg, "li"> =>
  li(
    [
      class_(
        todo.completed ? "todo done" : "todo",
      ),
      // a new item fades in; a removed / filtered-out one fades out before the
      // renderer detaches it (the deferred-removal exit lifecycle)
      fadeIn(150),
      fadeOut(150),
    ],
    [
      input(
        [
          type_("checkbox"),
          ...(todo.completed
            ? [attr("checked", "")]
            : []),
          onChange<Msg>(() => ({
            kind: "Toggled",
            id: todo.id,
          })),
        ],
        [],
      ),
      span(
        [class_("todo-title")],
        [text(todo.title)],
      ),
      button(
        [
          class_("todo-delete"),
          onClick<Msg>({
            kind: "Deleted",
            id: todo.id,
          }),
        ],
        [text("delete")],
      ),
    ],
  );

/**
 * Pure render: the screen for a given `Model`. Event handlers live in the tree
 * and produce `Msg`s the runtime feeds back into `update`. The filter buttons
 * and the search box change `filter`/`q`, which the runtime reflects into the
 * URL — no `setQueryState` call anywhere.
 */
export const view = (model: Model): Html<Msg> =>
  div(
    [class_("todos")],
    [
      header(
        [class_("todos-header")],
        [
          h1(
            [],
            [
              text(
                "plgg To-Do — Elm Architecture",
              ),
            ],
          ),
          p(
            [],
            [
              text(
                "One pure Model/update/view, rendered on the server (SSR) and taken over by the client (CSR) on plgg-view's minimal Elm Architecture. The filter and search are reflected to the URL.",
              ),
            ],
          ),
        ],
      ),
      form(
        [
          class_("todo-form"),
          onSubmit<Msg>({ kind: "Added" }),
        ],
        [
          input(
            [
              type_("text"),
              name_("title"),
              value_(model.draft),
              onInput<Msg>((value) => ({
                kind: "DraftChanged",
                value,
              })),
            ],
            [],
          ),
          button(
            [type_("submit")],
            [text("Add")],
          ),
        ],
      ),
      div(
        [class_("todo-toolbar")],
        [
          viewFilters(model),
          input(
            [
              type_("search"),
              name_("q"),
              value_(model.q),
              onInput<Msg>((value) => ({
                kind: "SearchChanged",
                value,
              })),
            ],
            [],
          ),
        ],
      ),
      ul(
        [class_("todo-list")],
        visibleTodos(model).map(viewTodo),
      ),
    ],
  );

/**
 * The URL-reflected slice of the Model, as a bidirectional query codec composed
 * from plgg-router's typed field codecs (explicit object literals — the no-cast
 * house rule rules out a generic record composer). `filter`/`q` at their
 * defaults are omitted from the query, so a pristine view has a clean `/` URL.
 */
type Query = Readonly<{
  filter: Filter;
  q: SoftStr;
}>;

const filterField = queryEnum(
  ["all", "active", "completed"],
  "all",
);
const searchField = queryStr("");

const queryCodec: QueryCodec<Query> = {
  decode: (query) => ({
    filter: filterField.decode(
      fromNullable(query["filter"]),
    ),
    q: searchField.decode(
      fromNullable(query["q"]),
    ),
  }),
  encode: (value) => ({
    ...writeField(
      "filter",
      filterField.encode(value.filter),
    ),
    ...writeField(
      "q",
      searchField.encode(value.q),
    ),
  }),
};

/**
 * The Elm-Architecture program. Now an `Application` (not a `sandbox`) so the
 * runtime owns the URL too: `init` seeds `filter`/`q` from the entry query,
 * `onUrlChange` folds a navigation back in, and `toUrl` *projects* the current
 * `filter`/`q` into the address bar after every update — a filter change pushes
 * a history entry (so back/forward traverses it), a keystroke in search only
 * replaces (no history spam). The server renders the same `view(init)` (see
 * `server.ts`); `main.ts` mounts this with `application(app)(root)`.
 */
export const app: Application<Model, Msg> = {
  init: (url) => ({
    ...init,
    ...queryCodec.decode(parseQuery(url.search)),
  }),
  update,
  view,
  onUrlChange: (url) => {
    const { filter, q } = queryCodec.decode(
      parseQuery(url.search),
    );
    return { kind: "UrlChanged", filter, q };
  },
  toUrl: (model) =>
    makeUrl(
      "/",
      serializeQuery(
        queryCodec.encode({
          filter: model.filter,
          q: model.q,
        }),
      ),
    ),
  historyMode: (prev, next) =>
    prev.filter !== next.filter
      ? "push"
      : "replace",
};
