import {
  type SoftStr,
  type Option,
  type PromisedResult,
  err,
  matchOption,
} from "plgg";
import {
  type HttpResponse,
  type HttpError,
  unauthorized,
  forbidden,
} from "plgg-http";
import {
  type Context,
  setState,
} from "plgg-server/Http/model/Context";
import {
  type Middleware,
  type Next,
} from "plgg-server/Http/model/Handler";

/**
 * The shared authorization gate both {@link requireRole} and
 * `requireScope` are built from: resolve a principal from the
 * request, then `None` → 401 (unauthenticated), `Some(p)`
 * failing `allowed` → 403 (forbidden), else stash the
 * principal under `stateKey` and continue. There is
 * deliberately **no default-allow branch** — an unresolved or
 * disallowed principal never reaches the handler.
 *
 * Auth-agnostic: plgg-server never imports an auth library —
 * the `resolve` seam is injected by the app (plggpress hands
 * it a `roleOf`-over-session resolver), so the layering
 * dependency crosses as a function, not a type.
 */
export const guardBy =
  <P>(
    stateKey: SoftStr,
    resolve: (c: Context) => Promise<Option<P>>,
    allowed: (p: P) => boolean,
  ): Middleware =>
  (
    c: Context,
    next: Next,
  ): PromisedResult<HttpResponse, HttpError> =>
    resolve(c).then(
      matchOption<
        P,
        PromisedResult<HttpResponse, HttpError>
      >(
        () =>
          Promise.resolve(
            err(
              unauthorized(
                "authentication required",
              ),
            ),
          ),
        (p: P) =>
          allowed(p)
            ? next(setState(stateKey, p)(c))
            : Promise.resolve(
                err(
                  forbidden(
                    "insufficient privileges",
                  ),
                ),
              ),
      ),
    );

/**
 * Require the request's principal to hold an allowed role.
 * `resolve` reads the role from the request (a session
 * cookie, a bearer token — the app decides); `allowed`
 * decides which roles pass. The principal is stashed under
 * `"principalRole"` for the handler.
 */
export const requireRole = <R>(
  resolve: (c: Context) => Promise<Option<R>>,
  allowed: (r: R) => boolean,
): Middleware =>
  guardBy("principalRole", resolve, allowed);
