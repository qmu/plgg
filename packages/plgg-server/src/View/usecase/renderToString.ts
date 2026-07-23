/**
 * Server-side rendering now lives in plgg-view — a pure `Html<Msg>` → string
 * fold (handlers dropped, text/attrs escaped). plgg-server re-exports it so the
 * HTTP layer keeps one import surface for turning a view into a response, and
 * the escaping logic has a single home (plgg-view), not a duplicate per package.
 */
export { renderToString } from "plgg-view";
/**
 * `collectCss` folds the same `Html` tree into its exact atomic stylesheet —
 * re-exported alongside `renderToString` so {@link htmlDocument} can inline the
 * critical CSS into `<head>` from the one import surface.
 */
export { collectCss } from "plgg-view";
