import { VNode } from "plgg-view";
import { Todo, TodoItem } from "./TodoItem";

/**
 * Renders a list of to-dos, or an empty-state message. Two things to notice:
 *
 * - **Conditional rendering** is just a ternary returning a different `VNode`.
 * - **List rendering** is `array.map(...)` dropped straight into JSX children;
 *   `plgg-view` flattens the resulting array, so there is no `Fragment`
 *   ceremony and no `key` bookkeeping (this POC renders statically).
 */
export const TodoList = (props: {
  todos: ReadonlyArray<Todo>;
}): VNode =>
  props.todos.length === 0 ? (
    <p class="empty">Nothing to do yet.</p>
  ) : (
    <ul class="todos">
      {props.todos.map((todo) => (
        <TodoItem todo={todo} />
      ))}
    </ul>
  );
