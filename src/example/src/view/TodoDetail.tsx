import { pipe, matchOption } from "plgg";
import { VNode } from "plgg-view";
import { Todo } from "../models/Todo";

/**
 * The single-Todo detail view for the `/todos/:id` route — the second of the
 * app's two client routes. Rendered on both sides like every other view: the
 * server SSRs it for a deep link (see `controller/app.ts`), and the client
 * router (`client.tsx`) renders it when navigating to a todo. A real
 * `<a href="/">` back-link lets plgg-router's click interceptor drive the
 * return to the list (keyboard-operable, open-in-new-tab works).
 */
export const TodoDetail = (props: {
  todo: Todo;
}): VNode => (
  <main id="app" class="todo-detail">
    <p>
      <a href="/" class="back-link">
        ← Back to list
      </a>
    </p>
    <h1>{props.todo.title}</h1>
    <p
      class={
        props.todo.completed
          ? "todo-meta done"
          : "todo-meta open"
      }
    >
      {props.todo.completed ? "Completed" : "Open"}
    </p>
    <p class="todo-meta">
      created {props.todo.createdAt.toISOString()}
    </p>
    {pipe(
      props.todo.completedAt,
      matchOption(
        (): VNode => (
          <p class="todo-meta open">
            not completed yet
          </p>
        ),
        (completedAt): VNode => (
          <p class="todo-meta done">
            completed {completedAt.toISOString()}
          </p>
        ),
      ),
    )}
  </main>
);

/**
 * Rendered when a route matches but no todo has the requested id (a stale or
 * hand-typed `/todos/:id`), and as the router's `notFound` view for any
 * unmatched path. A 200 in-shell view (not a hard 404) so the SPA stays
 * navigable — the back-link returns to the list.
 */
export const TodoNotFound = (): VNode => (
  <main id="app" class="todo-detail">
    <p>
      <a href="/" class="back-link">
        ← Back to list
      </a>
    </p>
    <h1>Not found</h1>
    <p>No to-do matches that address.</p>
  </main>
);
