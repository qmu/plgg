import { Handler } from "plgg-router/Routing/model/Handler";
import {
  Route,
  makeRoute,
} from "plgg-router/Routing/model/Route";
import { splitPath } from "plgg-router/Routing/usecase/compilePattern";

/**
 * The client router: pure, immutable data — just a route table. It has no
 * methods. Routes are added by composing data-last `Router => Router`
 * transformers (`get`/`on`, `route`) through plgg's `pipe`, mirroring
 * plgg-server's `Web` builder exactly minus everything HTTP-specific
 * (`post`/`put`/`del`/..., `use(middleware)`):
 *
 * @example
 * const app: Router = pipe(
 *   router(),
 *   get("/", home),
 *   get("/users/:id", showUser),
 *   route("/admin", adminRoutes),
 * );
 *
 * It is run with the standalone `resolve` (pure `Location -> Option<VNode>`) or
 * driven against the DOM with `start` from the `plgg-router/client` subpath.
 */
export type Router = Readonly<{
  routes: ReadonlyArray<Route>;
}>;

/**
 * The empty router: the seed of a routing pipeline.
 */
export const router = (): Router => ({ routes: [] });

/**
 * Registers a route. Data-last: returns a `Router => Router` transformer for use
 * in a `pipe`. First match wins at `resolve` time, so registration order is
 * significant.
 */
export const on =
  (path: string, handler: Handler) =>
  (r: Router): Router => ({
    routes: [...r.routes, makeRoute(path, handler)],
  });

/**
 * Alias of {@link on}, retained for visual symmetry with plgg-server's `get`.
 */
export const get = (
  path: string,
  handler: Handler,
) => on(path, handler);

/**
 * Joins a base path with a sub-route pattern into one normalized path.
 */
const joinPath = (
  basePath: string,
  pattern: string,
): string =>
  "/" +
  [
    ...splitPath(basePath),
    ...splitPath(pattern),
  ].join("/");

/**
 * Mounts a sub-router under a base path, rebasing each of its routes with the
 * prefix and recompiling segments. Data-last `Router => Router`.
 */
export const route =
  (basePath: string, sub: Router) =>
  (r: Router): Router => ({
    routes: [
      ...r.routes,
      ...sub.routes.map((rt) =>
        makeRoute(
          joinPath(basePath, rt.pattern),
          rt.handler,
        ),
      ),
    ],
  });
