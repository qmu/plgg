/**
 * The plggmatic Navigate module: the strip's SCREEN STATE
 * and how a URL carries it. A composition is an ordered
 * list of `(route, optional highlighted span)` — one
 * concept for a strip you walked into by following links
 * and a strip something assembled for you, because they
 * are the same object.
 *
 * The framework owns this because the framework emits the
 * strip: a product renders columns, it does not decide
 * what a column IS or how a strip is addressed.
 */
export {
  type Column,
  type Composition,
  columnOf,
  columnWithSpan,
  soloComposition,
  columnsOf,
} from "plggmatic/Navigate/model/Composition";
export {
  restParam,
  spanParam,
  decodeComposition,
  compositionQuery,
  compositionHref,
} from "plggmatic/Navigate/usecase/compositionUrl";
