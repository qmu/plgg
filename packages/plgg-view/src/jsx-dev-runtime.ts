/**
 * Development JSX runtime. Bundlers in dev/test mode (Vite/esbuild) emit
 * `jsxDEV` instead of `jsx`; it carries extra debug arguments that this POC
 * ignores, delegating straight to {@link jsx}. The `JSX` namespace used for
 * type-checking lives in `jsx-runtime` — the compiler always reads it from
 * there, so it is not redeclared here.
 */
import { VNode } from "plgg-view/index";
import {
  ElementType,
  JsxProps,
  jsx,
} from "plgg-view/Vnode/usecase/jsx";

export { Fragment } from "plgg-view/Vnode/usecase/jsx";

/**
 * Dev-mode element factory: drops the debug metadata and builds the node.
 */
export const jsxDEV = (
  type: ElementType,
  props: JsxProps,
): VNode => jsx(type, props);
