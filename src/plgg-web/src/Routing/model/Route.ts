import { SoftStr } from "plgg";
import {
  Method,
  Handler,
  Segment,
  compilePattern,
} from "plgg-web/index";

/**
 * A registered route: a method + compiled path pattern + its handler.
 */
export type Route = Readonly<{
  method: Method;
  pattern: SoftStr;
  segments: ReadonlyArray<Segment>;
  handler: Handler;
}>;

/**
 * Constructs a route, compiling its pattern up front.
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
});
