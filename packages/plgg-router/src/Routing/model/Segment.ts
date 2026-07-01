import { SoftStr, defineVariant } from "plgg";

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
const Static = defineVariant("Static")<SoftStr>();
const Param = defineVariant("Param")<SoftStr>();
const Wildcard =
  defineVariant("Wildcard")<SoftStr>();

export type Segment =
  | ReturnType<typeof Static.make>
  | ReturnType<typeof Param.make>
  | ReturnType<typeof Wildcard.make>;

/**
 * Constructs a static segment.
 */
export const staticSegment = (
  value: SoftStr,
): Segment => Static.make(value);

/**
 * Constructs a named parameter segment.
 */
export const paramSegment = (
  name: SoftStr,
): Segment => Param.make(name);

/**
 * Constructs a wildcard segment capturing the path remainder.
 */
export const wildcardSegment = (
  name: SoftStr,
): Segment => Wildcard.make(name);
