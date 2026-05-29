import { pipe, matchOption } from "plgg";
import { VNode } from "plgg-view";
import { Todo } from "../models/Todo";

/**
 * One row of the list — checkbox (toggle), title text, and delete button. The
 * surrounding `<li>` carries `data-todo-id` so the CSR side (`client.tsx`) can
 * find the row when wiring the toggle/delete handlers; the inner controls carry
 * `data-action` so the listener can dispatch by intent (`toggle` vs `delete`)
 * without re-binding per render.
 */
export const TodoItem = (props: { todo: Todo }): VNode => (
  <li
    class={
      props.todo.completed ? "todo done" : "todo"
    }
    data-todo-id={props.todo.id}
  >
    <input
      type="checkbox"
      class="todo-toggle"
      data-action="toggle"
      data-todo-id={props.todo.id}
      checked={props.todo.completed}
    />
    <a
      class="todo-title"
      href={`/todos/${props.todo.id}`}
    >
      {props.todo.title}
    </a>
    {pipe(
      props.todo.completedAt,
      matchOption(
        (): VNode => (
          <span class="todo-meta open">open</span>
        ),
        (completedAt): VNode => (
          <span class="todo-meta done">
            completed {completedAt.toISOString()}
          </span>
        ),
      ),
    )}
    <button
      type="button"
      class="todo-delete"
      data-action="delete"
      data-todo-id={props.todo.id}
    >
      delete
    </button>
  </li>
);
