import { VNode, Child } from "plgg-view/index";

/**
 * Composition via children: whatever JSX is nested inside `<Card>…</Card>`
 * arrives as `props.children` (typed with plgg-view's `Child`) and is placed in
 * the body slot. This is how you build generic wrappers around any content.
 */
export const Card = (props: {
  title: string;
  children?: Child;
}): VNode => (
  <section class="card">
    <h3 class="card-title">{props.title}</h3>
    <div class="card-body">{props.children}</div>
  </section>
);
