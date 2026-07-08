import { SoftStr, match } from "plgg";
import {
  Html,
  element$,
  text$,
  raw$,
} from "plgg-view/Html/model/Html";
import { Attribute } from "plgg-view/Html/model/Attribute";

/**
 * An algebra for folding an {@link Html} tree into some result `R` — one handler
 * per node kind. `element` receives its children **already folded** (the
 * catamorphism recurses children first) plus the raw {@link Attribute} list, so
 * a renderer decides what to do with handlers (the SSR fold drops them; the DOM
 * fold wires them). `raw` receives the passthrough HTML string; a renderer
 * decides whether to emit it verbatim (SSR) or treat it as inert (CSS
 * collection). Deliberately neutral: it knows the shape, not the target.
 */
export type HtmlAlgebra<Msg, R> = Readonly<{
  element: (
    tag: SoftStr,
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<R>,
  ) => R;
  text: (value: SoftStr) => R;
  raw: (html: SoftStr) => R;
}>;

/**
 * Folds an {@link Html} node into `R` under the given {@link HtmlAlgebra} — the
 * one traversal of the view tree, shared by every renderer.
 */
export const foldHtml =
  <Msg, R>(alg: HtmlAlgebra<Msg, R>) =>
  (node: Html<Msg>): R =>
    match(node)(
      [
        element$(),
        ({ content }): R =>
          alg.element(
            content.tag,
            content.attributes,
            content.children.map(foldHtml(alg)),
          ),
      ],
      [
        text$(),
        ({ content }): R =>
          alg.text(content.value),
      ],
      [
        raw$(),
        ({ content }): R => alg.raw(content.html),
      ],
    );
