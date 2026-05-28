import {
  PromisedResult,
  SoftStr,
  Dict,
  isSome,
  err,
  pipe,
  fromNullable,
  getOr,
  matchOption,
} from "plgg";
import {
  Route,
  Middleware,
  Handler,
  Context,
  HttpRequest,
  HttpResponse,
  HttpError,
  makeContext,
  matchSegments,
  compileRoutes,
  lookupRoute,
  withParams,
  notFound,
  methodNotAllowed,
  internalError,
} from "plgg-server/index";

/**
 * Folds the middleware stack around the final handler into a single function,
 * implementing the onion model: the first middleware is outermost. The whole
 * chain shares the `PromisedResult<HttpResponse, HttpError>` contract.
 *
 * State threads immutably: when a middleware calls `next(updated)` the rest of
 * the chain runs with `updated`; a bare `next()` reuses the current context.
 */
const compose = (
  middlewares: ReadonlyArray<Middleware>,
  handler: Handler,
): ((
  c: Context,
) => PromisedResult<HttpResponse, HttpError>) =>
  middlewares.reduceRight<
    (
      c: Context,
    ) => PromisedResult<HttpResponse, HttpError>
  >(
    (next, mw) => (c) =>
      mw(c, (updated) =>
        next(pipe(fromNullable(updated), getOr(c))),
      ),
    handler,
  );

/**
 * Runs a matched route's handler through the middleware chain, turning a thrown
 * handler into an `InternalError` value. The onion is the global middleware
 * (outermost) wrapping the route's scoped group middleware wrapping the
 * handler, so top-level `use()` runs for every route and group middleware runs
 * only for the routes it was mounted onto.
 */
const runMatched = (
  middlewares: ReadonlyArray<Middleware>,
  request: HttpRequest,
  route: Route,
  params: Dict<string, SoftStr>,
): PromisedResult<HttpResponse, HttpError> =>
  pipe(
    makeContext(withParams(request, params)),
    compose(
      [...middlewares, ...route.middlewares],
      route.handler,
    ),
    (settled) =>
      settled.catch(() =>
        err(internalError("handler threw")),
      ),
  );

/**
 * The cold path taken when no route matched the method+path: scans the flat
 * route list (registration order) for any path match. Any path match means the
 * method was wrong (405, reporting the allowed methods); none means 404. This
 * mirrors the original scan exactly, so the `Allow` ordering is preserved.
 */
const unmatched = (
  routes: ReadonlyArray<Route>,
  request: HttpRequest,
): PromisedResult<HttpResponse, HttpError> =>
  pipe(
    routes.filter((r) =>
      isSome(matchSegments(r.segments, request.path)),
    ),
    (matching) =>
      Promise.resolve(
        matching.length > 0
          ? err(
              methodNotAllowed(
                matching.map((r) => r.method),
              ),
            )
          : err(notFound(request.path)),
      ),
  );

/**
 * Resolves a plgg-native request against the compiled route table and runs the
 * matching handler through the middleware chain. The outcome is a value:
 *
 * - match found → the handler's `Result` (a thrown handler becomes an
 *   `InternalError`)
 * - path matched but method did not → `MethodNotAllowed`
 * - no path matched → `NotFound`
 *
 * The table is compiled once per route list (memoized), so a static path is an
 * `O(1)` map hit and dynamic routes are walked only within the request method —
 * never a full scan of unrelated routes on the success path.
 */
export const dispatch = (
  routes: ReadonlyArray<Route>,
  middlewares: ReadonlyArray<Middleware>,
  request: HttpRequest,
): PromisedResult<HttpResponse, HttpError> =>
  pipe(
    lookupRoute(
      compileRoutes(routes),
      request.method,
      request.path,
    ),
    matchOption(
      () => unmatched(routes, request),
      (m) =>
        runMatched(
          middlewares,
          request,
          m.route,
          m.params,
        ),
    ),
  );
