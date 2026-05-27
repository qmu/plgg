/**
 * Automatic JSX runtime. `jsxImportSource: "plgg-view"` makes the compiler emit
 * imports of `jsx`/`jsxs`/`Fragment` from this module, and resolve the `JSX`
 * namespace below for type-checking `.tsx` — so `.tsx` compiles against this
 * package's own hyperscript with no React/Preact dependency.
 */
import { VNode } from "plgg-view/index";

export {
  jsx,
  jsxs,
  Fragment,
} from "plgg-view/Vnode/usecase/jsx";

/**
 * The JSX type surface the compiler consults under the automatic runtime.
 * Deliberately permissive for this POC: any intrinsic tag accepts any props,
 * and a rendered element is a {@link VNode}.
 */
export namespace JSX {
  /** The result type of a JSX expression. */
  export type Element = VNode;

  /** Names the prop that receives nested children. */
  export interface ElementChildrenAttribute {
    readonly children: object;
  }

  /** Every lowercase tag is allowed with an open-ended attribute bag. */
  export interface IntrinsicElements {
    readonly [tag: string]: Readonly<Record<string, unknown>>;
  }
}
