import { VNode } from "plgg-view";

/**
 * A single to-do item. Plain data — the kind of thing your client-side app
 * already has in hand.
 */
export type Todo = Readonly<{
  id: string;
  label: string;
  done: boolean;
}>;

/**
 * A function component: props in, a {@link VNode} out. No class, no hooks. The
 * `class` attribute is just a string expression, and the leading marker plus
 * the label are text children — both are HTML-escaped by `renderToString`, so a
 * label containing `<`, `>` or `&` is safe with no extra work.
 */
export const TodoItem = (props: { todo: Todo }): VNode => (
  <li class={props.todo.done ? "todo done" : "todo"}>
    <span class="marker">{props.todo.done ? "✓" : "○"}</span>
    <span class="label">{props.todo.label}</span>
  </li>
);
