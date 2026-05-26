import {
  Option,
  PromisedResult,
  SoftStr,
  Dict,
  isSome,
  err,
  pipe,
  fromNullable,
  mapOption,
  getOr,
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
  withParams,
  notFound,
  methodNotAllowed,
  internalError,
} from "plgg-web/index";

/**
 * A route paired with the result of matching it against the request path.
 */
type Candidate = Readonly<{
  route: Route;
  match: Option<Dict<string, SoftStr>>;
}>;

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
 * handler into an `InternalError` value.
 */
const runMatched = (
  middlewares: ReadonlyArray<Middleware>,
  request: HttpRequest,
  route: Route,
  params: Dict<string, SoftStr>,
): PromisedResult<HttpResponse, HttpError> =>
  pipe(
    makeContext(withParams(request, params)),
    compose(middlewares, route.handler),
    (settled) =>
      settled.catch(() =>
        err(internalError("handler threw")),
      ),
  );

/**
 * Resolves a plgg-native request against the route table and runs the matching
 * handler through the middleware chain. The outcome is a value:
 *
 * - match found → the handler's `Result` (a thrown handler becomes an
 *   `InternalError`)
 * - path matched but method did not → `MethodNotAllowed`
 * - no path matched → `NotFound`
 */
export const dispatch = (
  routes: ReadonlyArray<Route>,
  middlewares: ReadonlyArray<Middleware>,
  request: HttpRequest,
): PromisedResult<HttpResponse, HttpError> =>
  pipe(
    routes.map(
      (route): Candidate => ({
        route,
        match: matchSegments(
          route.segments,
          request.path,
        ),
      }),
    ),
    (candidates) =>
      candidates.filter((c) => isSome(c.match)),
    (matching) =>
      pipe(
        fromNullable(
          matching.find(
            (c) => c.route.method === request.method,
          ),
        ),
        mapOption((c) =>
          runMatched(
            middlewares,
            request,
            c.route,
            pipe(
              c.match,
              getOr<Dict<string, SoftStr>>({}),
            ),
          ),
        ),
        getOr<PromisedResult<HttpResponse, HttpError>>(
          Promise.resolve(
            matching.length > 0
              ? err(
                  methodNotAllowed(
                    matching.map(
                      (c) => c.route.method,
                    ),
                  ),
                )
              : err(notFound(request.path)),
          ),
        ),
      ),
  );
