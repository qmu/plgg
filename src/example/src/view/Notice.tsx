import { VNode } from "plgg-view";

/**
 * Conditional children two ways: a ternary that picks an element, and the
 * `cond && <x/>` short-circuit whose `false` simply drops (so the urgent marker
 * only appears when `urgent` is true).
 */
export const Notice = (props: {
  message: string;
  urgent: boolean;
}): VNode => (
  <div class={props.urgent ? "notice urgent" : "notice"}>
    {props.urgent && <strong class="bang">!</strong>}
    <span class="text">{props.message}</span>
  </div>
);
