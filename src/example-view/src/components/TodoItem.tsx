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
 * `class` attribute is just a string expression, and the marker and label are
 * text children — they become `Text` nodes in the view tree, holding their raw
 * value (this library does not serialize, so it does no escaping).
 */
export const TodoItem = (props: { todo: Todo }): VNode => (
  <li class={props.todo.done ? "todo done" : "todo"}>
    <span class="marker">{props.todo.done ? "✓" : "○"}</span>
    <span class="label">{props.todo.label}</span>
  </li>
);
