import { SoftStr } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { SemType } from "plgg-ir-language";

/**
 * One projected field: the exposed name (the path's
 * last segment) and its resolved type.
 */
export type ProjectedField = Readonly<{
  name: SoftStr;
  type: SemType;
}>;

/**
 * One projection of the canonical manifest IR
 * (design.md §15): the deliberate, reviewable way a
 * view reaches data outside its query scope. Only the
 * listed fields are exposed — anything else fails
 * static verification.
 */
export type Projection = Readonly<{
  name: SoftStr;
  from: SoftStr;
  fields: ReadonlyArray<ProjectedField>;
  range: SourceRange;
}>;

/**
 * Builds a {@link Projection}.
 */
export const projection = (
  name: SoftStr,
  from: SoftStr,
  fields: ReadonlyArray<ProjectedField>,
  range: SourceRange,
): Projection => ({ name, from, fields, range });
