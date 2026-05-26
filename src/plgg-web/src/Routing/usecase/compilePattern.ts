import { SoftStr } from "plgg";
import {
  Segment,
  staticSegment,
  paramSegment,
  wildcardSegment,
} from "plgg-web/index";

/**
 * Splits a path into its non-empty segments, ignoring leading/trailing and
 * repeated slashes.
 */
export const splitPath = (
  path: SoftStr,
): ReadonlyArray<SoftStr> =>
  path.split("/").filter((s) => s.length > 0);

/**
 * Compiles a route pattern string into a list of {@link Segment}s.
 *
 * Supported syntax:
 * - `:name` — named parameter
 * - `*` or `*name` — wildcard capturing the remainder (named `*` by default)
 * - anything else — a literal/static segment
 */
export const compilePattern = (
  pattern: SoftStr,
): ReadonlyArray<Segment> =>
  splitPath(pattern).map((raw) =>
    raw === "*"
      ? wildcardSegment("*")
      : raw.startsWith("*")
        ? wildcardSegment(raw.slice(1))
        : raw.startsWith(":")
          ? paramSegment(raw.slice(1))
          : staticSegment(raw),
  );
