import { SoftStr } from "plgg";
import { Sandbox } from "plgg-view/client";
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
} from "plgg-view";
import { Todo } from "./Todo";

/**
 * The whole app state as one immutable value: the todo list, the add-form draft,
 * and the next id to assign (kept in the Model so `update` stays pure — no
 * `randomUUID`/counter side effect).
 */
export type Model = Readonly<{
  todos: ReadonlyArray<Todo>;
  draft: SoftStr;
  nextId: number;
}>;

/** Everything that can happen, as data. */
export type Msg =
  | Readonly<{
      kind: "DraftChanged";
      value: SoftStr;
    }>
  | Readonly<{ kind: "Added" }>
  | Readonly<{ kind: "Toggled"; id: number }>
  | Readonly<{ kind: "Deleted"; id: number }>;

export const init: Model = {
  todos: [],
  draft: "",
  nextId: 1,
};

/**
 * Pure state transition: a `Msg` and the old `Model` in, the new `Model` out.
 * No DOM, no effects — trivially unit-testable.
 */
export const update = (
  msg: Msg,
  model: Model,
): Model =>
  msg.kind === "DraftChanged"
    ? { ...model, draft: msg.value }
    : msg.kind === "Added"
      ? model.draft.trim().length === 0
        ? model
        : {
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
            todos: model.todos.map((todo) =>
              todo.id === msg.id
                ? {
                    ...todo,
                    completed: !todo.completed,
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

const viewTodo = (todo: Todo): Html<Msg> =>
  li(
    [
      class_(
        todo.completed ? "todo done" : "todo",
      ),
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
 * (`onInput`/`onSubmit`/`onChange`/`onClick`) and produce `Msg`s the runtime
 * feeds back into `update`.
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
                "One pure Model/update/view, rendered on the server (SSR) and taken over by the client (CSR) on plgg-view's minimal Elm Architecture.",
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
      ul(
        [class_("todo-list")],
        model.todos.map(viewTodo),
      ),
    ],
  );

/**
 * The Elm-Architecture program: pure `init`/`update`/`view`. The client runs it
 * with `sandbox(app)(container)` (`plgg-view/client`, see `main.ts`); the server
 * renders the same `view(init)` to HTML with plgg-server's `pageResponse` (see
 * `server.ts`). One program, two render targets.
 */
export const app: Sandbox<Model, Msg> = {
  init,
  update,
  view,
};
