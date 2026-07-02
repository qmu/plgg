// Plain-TS build tool: plgg-bundle is a foundation
// bundler and must not depend on the libraries it builds
// (plgg / plgg-server). So the dev server speaks the
// Web-standard request/response contract directly rather
// than plgg-server's branded `Fetch`. See the package
// README and the ticket's hard constraints.

/**
 * The Web-standard request handler an app hands the dev
 * server: `Request => Promise<Response>`. This is the same
 * shape plgg-server's `toFetch` produces, reproduced here
 * as a bare structural type so the toolchain never imports
 * a plgg package.
 */
export type Fetch = (
  request: Request,
) => Promise<Response>;

/**
 * The app⇄dev-server contract. An app's **dev entry**
 * module default-exports a factory that builds its
 * {@link Fetch}. The dev server calls it once on start and
 * again after every hot-reload — a cache-busted re-import
 * of the entry re-runs the factory over freshly
 * re-evaluated source, which is how a code edit takes
 * effect with no process restart. The factory may be
 * async (config load, route discovery).
 */
export type FetchFactory = () =>
  | Fetch
  | Promise<Fetch>;
