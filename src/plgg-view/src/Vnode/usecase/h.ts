import { SoftStr } from "plgg";
import {
  VNode,
  Props,
  Child,
  element,
  normalizeChildren,
} from "plgg-view/index";

/**
 * Hyperscript: the explicit, non-JSX way to build an {@link Element}. `props`
 * is already a string-valued {@link Props} map (or `null` for none); children
 * are variadic and normalized (primitives lift to `Text`, arrays flatten,
 * `false`/`null`/`undefined` drop). The JSX runtime is a thin wrapper over the
 * same idea — `h` is what a hand-written, plgg-native view uses.
 */
export const h = (
  tag: SoftStr,
  props: Props | null,
  ...children: ReadonlyArray<Child>
): VNode =>
  element(tag, props ?? {}, normalizeChildren(children));
