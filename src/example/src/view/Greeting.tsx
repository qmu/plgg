import { VNode } from "plgg-view";

/**
 * Basics: a function component with a typed prop, and text interpolated around
 * a nested element (`Hello, <strong>{name}</strong>!` becomes three children —
 * the text "Hello, ", the `<strong>` element, and the text "!").
 */
export const Greeting = (props: { name: string }): VNode => (
  <p>
    Hello, <strong>{props.name}</strong>!
  </p>
);
