import { SoftStr } from "plgg";
import { Segment } from "plgg-router/Routing/model/Segment";
import { Handler } from "plgg-router/Routing/model/Handler";
import { compilePattern } from "plgg-router/Routing/usecase/compilePattern";

/**
 * A registered route: a compiled path pattern + its handler. There is no
 * `method` field — SPA routes are method-less (the browser only ever GETs a
 * URL); that is the one field dropped from plgg-server's `Route`.
 */
export type Route = Readonly<{
  pattern: SoftStr;
  segments: ReadonlyArray<Segment>;
  handler: Handler;
}>;

/**
 * Constructs a route, compiling its pattern up front.
 */
export const makeRoute = (
  pattern: SoftStr,
  handler: Handler,
): Route => ({
  pattern,
  segments: compilePattern(pattern),
  handler,
});
