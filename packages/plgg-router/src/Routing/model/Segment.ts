import { Box, SoftStr, box } from "plgg";

/**
 * A compiled path segment, modeled as a plgg `Box` union.
 *
 * - `Static`: must equal the incoming path part verbatim (content = literal).
 * - `Param`: captures one path part (content = parameter name).
 * - `Wildcard`: captures the remainder (content = capture name).
 *
 * This is the client-side parallel of plgg-server's `Routing/model/Segment` —
 * defined verbatim by design (see README "Naming"), not imported, because peer
 * experimental packages do not depend on each other.
 */
export type Segment =
  | Box<"Static", SoftStr>
  | Box<"Param", SoftStr>
  | Box<"Wildcard", SoftStr>;

/**
 * Constructs a static segment.
 */
export const staticSegment = (
  value: SoftStr,
): Segment => box("Static")(value);

/**
 * Constructs a named parameter segment.
 */
export const paramSegment = (
  name: SoftStr,
): Segment => box("Param")(name);

/**
 * Constructs a wildcard segment capturing the path remainder.
 */
export const wildcardSegment = (
  name: SoftStr,
): Segment => box("Wildcard")(name);
