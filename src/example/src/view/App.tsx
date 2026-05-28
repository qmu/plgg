import { VNode } from "plgg-view";
import { Todo } from "../models/Todo";
import { TodoItem } from "./TodoItem";
import { TodoForm } from "./TodoForm";

/**
 * The full To-Do list view — header, add-todo form, and the list of items.
 * Authored once and rendered on **both** the server (to HTML, see
 * `controller/app.ts`) and the client (to DOM, see `client.tsx`) by handing it
 * the same `Todo[]` decoded with the same `asTodos`. One component tree, two
 * renderers (both over plgg-view): that is what makes the app isomorphic.
 */
export const App = (props: {
  todos: ReadonlyArray<Todo>;
}): VNode => (
  <main id="app" class="todos">
    <header class="todos-header">
      <h1>plgg To-Do</h1>
      <p>
        A real-app demo over plgg, plgg-server, plgg-sql, plgg-view, and
        plgg-fetch: classic MVC, SSR + CSR, typed HTTP on both sides of the
        wire.
      </p>
    </header>
    <TodoForm />
    <ul class="todo-list">
      {props.todos.map((todo) => (
        <TodoItem todo={todo} />
      ))}
    </ul>
  </main>
);
