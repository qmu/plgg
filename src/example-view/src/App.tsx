import { VNode } from "plgg-view";
import { Layout, TodoList, Todo } from "./components";

/**
 * Sample data. In a real app this comes from state / an API; here it is a
 * constant so the example renders deterministically. One label deliberately
 * contains `<`, `>` and `&` to show that output is escaped by default.
 */
const TODOS: ReadonlyArray<Todo> = [
  { id: "1", label: "Read the plgg-view README", done: true },
  { id: "2", label: "Build a <component> & ship it", done: false },
  { id: "3", label: "Defer DOM mounting (POC)", done: false },
];

/**
 * The application: a feature component (`TodoList`) composed inside a generic
 * shell (`Layout`) via JSX children. `App` is itself just a `() => VNode`.
 */
export const App = (
  props: { todos?: ReadonlyArray<Todo> } = {},
): VNode => {
  const todos = props.todos ?? TODOS;
  return (
    <Layout
      title="plgg-view todos"
      remaining={todos.filter((t) => !t.done).length}
    >
      <TodoList todos={todos} />
    </Layout>
  );
};
