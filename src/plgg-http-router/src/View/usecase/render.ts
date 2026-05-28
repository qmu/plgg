import {
  VNode,
  VNodeAlgebra,
  foldVNode,
} from "plgg-view";
// Import the escape module directly (not the package barrel): the barrel pulls
// in `Serving`/`node:http`, which must never reach the browser client bundle.
import { isSafeAttrName } from "plgg-http-router/View/usecase/escape";

/**
 * The CSR algebra: fold a {@link VNode} into real DOM. Text becomes a `Text`
 * node, a fragment a `DocumentFragment`, an element a created node with safe
 * attributes and appended children. Children arrive already built (the fold
 * recurses depth-first), so each handler only assembles its node. This is the
 * client counterpart to the SSR string algebra — same tree, different target.
 */
const domAlgebra: VNodeAlgebra<Node> = {
  text: (value) => document.createTextNode(value),
  fragment: (children) => {
    const frag = document.createDocumentFragment();
    children.forEach((child) => frag.appendChild(child));
    return frag;
  },
  element: (tag, props, children) => {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([name, value]) => {
      if (isSafeAttrName(name)) {
        el.setAttribute(name, value);
      }
    });
    children.forEach((child) => el.appendChild(child));
    return el;
  },
};

/**
 * Client-side rendering: build DOM from a {@link VNode} and mount it into
 * `container`, replacing whatever is there (so it cleanly takes over the
 * server-rendered markup). The only DOM-touching function in the package —
 * shipped on the `plgg-http-router/client` subpath so server code never pulls it in.
 */
export const render = (
  node: VNode,
  container: Element,
): void => {
  container.replaceChildren(foldVNode(domAlgebra)(node));
};
