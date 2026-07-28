import { type SoftStr, type Option } from "plgg";

// What "on the same page" MEANS, as data. The assistant is
// grounded in the document the writer has open, so the browser
// tells the server which ROUTE it is on and the server answers
// with the markdown behind it — the text plus the
// content-root-relative path the live-edit bridge accepts.
//
// Resolving the route server-side is deliberate: the mapping
// from a route to its `*.md` is the render path's own
// (`candidateFiles`), and duplicating it in the browser would
// be a second, drifting inverse of `discoverPaths`. It also
// means the model never names a file — the edit target is
// fixed by the server for the whole session.

/** The document a voice session is grounded in. */
export type OpenDoc = Readonly<{
  /** Content-root-relative, e.g. `guide/intro.md`. */
  path: SoftStr;
  /** The markdown source as the writer sees it. */
  text: SoftStr;
}>;

/**
 * Resolve the route the browser is on to its source document.
 * `None` when the route has no readable `*.md` behind it — a
 * session may still start, ungrounded, rather than failing.
 *
 * Injected as a seam so the mint route stays offline-testable:
 * the node edge is the only implementation that touches the
 * filesystem.
 */
export type OpenDocReader = (
  routePath: SoftStr,
) => Promise<Option<OpenDoc>>;
