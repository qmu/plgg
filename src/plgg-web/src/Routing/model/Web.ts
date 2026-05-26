import {
  Method,
  Handler,
  Middleware,
  Route,
  makeRoute,
  splitPath,
} from "plgg-web/index";

/**
 * The web application: pure, immutable data — a route table and a middleware
 * stack. It has no methods. Routes and middleware are added by composing
 * data-last `Web => Web` transformers (`get`, `post`, `use`, `route`, ...)
 * through plgg's `pipe`, the same way every other plgg value is built:
 *
 * @example
 * const app: Web = pipe(
 *   web(),
 *   use(logger),
 *   get("/", home),
 *   get("/users/:id", showUser),
 *   post("/echo", echo),
 * );
 *
 * It is run with the standalone `handle` (plgg-native core) or `toFetch` (the
 * Web `Request`/`Response` seam) — neither lives on the value itself.
 */
export type Web = Readonly<{
  routes: ReadonlyArray<Route>;
  middlewares: ReadonlyArray<Middleware>;
}>;

/**
 * The empty application: the seed of a routing pipeline.
 */
export const web = (): Web => ({
  routes: [],
  middlewares: [],
});

/**
 * Registers a route for an explicit method. Data-last: returns a `Web => Web`
 * transformer for use in a `pipe`.
 */
export const on =
  (method: Method, path: string, handler: Handler) =>
  (app: Web): Web => ({
    routes: [
      ...app.routes,
      makeRoute(method, path, handler),
    ],
    middlewares: app.middlewares,
  });

/** Registers a `GET` route. */
export const get = (path: string, handler: Handler) =>
  on("GET", path, handler);

/** Registers a `POST` route. */
export const post = (path: string, handler: Handler) =>
  on("POST", path, handler);

/** Registers a `PUT` route. */
export const put = (path: string, handler: Handler) =>
  on("PUT", path, handler);

/** Registers a `PATCH` route. */
export const patch = (path: string, handler: Handler) =>
  on("PATCH", path, handler);

/**
 * Registers a `DELETE` route. Named `del` because `delete` is a reserved word.
 */
export const del = (path: string, handler: Handler) =>
  on("DELETE", path, handler);

/** Registers a `HEAD` route. */
export const head = (path: string, handler: Handler) =>
  on("HEAD", path, handler);

/** Registers an `OPTIONS` route. */
export const options = (
  path: string,
  handler: Handler,
) => on("OPTIONS", path, handler);

/**
 * Appends a middleware to the onion stack. Data-last `Web => Web`.
 */
export const use =
  (mw: Middleware) =>
  (app: Web): Web => ({
    routes: app.routes,
    middlewares: [...app.middlewares, mw],
  });

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
 * Mounts a sub-application under a base path, rebasing its routes and merging
 * its middleware. Data-last `Web => Web`.
 */
export const route =
  (basePath: string, sub: Web) =>
  (app: Web): Web => ({
    routes: [
      ...app.routes,
      ...sub.routes.map((r) =>
        makeRoute(
          r.method,
          joinPath(basePath, r.pattern),
          r.handler,
        ),
      ),
    ],
    middlewares: [
      ...app.middlewares,
      ...sub.middlewares,
    ],
  });
