import { VNode } from "plgg-view";

/**
 * Prop coercion at the JSX seam: a `Num` attribute stringifies, a `Bool` `true`
 * becomes a bare attribute (empty string) and `false` is dropped entirely. Here
 * `data-count` becomes "3", `aria-hidden` is dropped when `muted` is false.
 */
export const Badge = (props: {
  count: number;
  muted: boolean;
}): VNode => (
  <span class="badge" data-count={props.count} aria-hidden={props.muted}>
    {props.count}
  </span>
);
