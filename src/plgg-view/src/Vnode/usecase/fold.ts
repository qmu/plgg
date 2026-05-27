import { SoftStr } from "plgg";
import { VNode, Props } from "plgg-view/index";

/**
 * An algebra for folding a {@link VNode} tree into some result `R` — one handler
 * per node kind. `element`/`fragment` receive their children **already folded**
 * (the catamorphism recurses children first), so a handler only combines `R`s.
 *
 * This is deliberately neutral: it knows the shape of the view, not what the
 * view becomes. A server renderer instantiates it with `R = string` (HTML), a
 * client renderer with `R = Node` (DOM) — neither concern lives in plgg-view.
 */
export type VNodeAlgebra<R> = Readonly<{
  element: (
    tag: SoftStr,
    props: Props,
    children: ReadonlyArray<R>,
  ) => R;
  text: (value: SoftStr) => R;
  fragment: (children: ReadonlyArray<R>) => R;
}>;

/**
 * Folds a {@link VNode} into `R` under the given {@link VNodeAlgebra} — the one
 * traversal of the view tree, shared by every renderer.
 */
export const foldVNode =
  <R>(alg: VNodeAlgebra<R>) =>
  (node: VNode): R =>
    node.__tag === "Text"
      ? alg.text(node.content.value)
      : node.__tag === "Fragment"
        ? alg.fragment(node.content.children.map(foldVNode(alg)))
        : alg.element(
            node.content.tag,
            node.content.props,
            node.content.children.map(foldVNode(alg)),
          );
