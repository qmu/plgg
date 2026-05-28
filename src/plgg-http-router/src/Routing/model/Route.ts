import { SoftStr } from "plgg";
import {
  Method,
  Handler,
  Middleware,
  Segment,
  compilePattern,
} from "plgg-http-router/index";

/**
 * A registered route: a method + compiled path pattern + its handler, plus the
 * group middleware stack scoped to it (outermost first). Top-level `use()`
 * middleware is applied globally at dispatch and is NOT carried here; only the
 * middleware of the sub-apps this route was mounted through accumulates in
 * `middlewares`, so a guard on `/api` runs for `/api/*` and nowhere else.
 */
export type Route = Readonly<{
  method: Method;
  pattern: SoftStr;
  segments: ReadonlyArray<Segment>;
  handler: Handler;
  middlewares: ReadonlyArray<Middleware>;
}>;

/**
 * Constructs a route, compiling its pattern up front. A freshly registered
 * route carries no group middleware; `route()` accumulates it on mount.
 */
export const makeRoute = (
  method: Method,
  pattern: SoftStr,
  handler: Handler,
): Route => ({
  method,
  pattern,
  segments: compilePattern(pattern),
  handler,
  middlewares: [],
});
