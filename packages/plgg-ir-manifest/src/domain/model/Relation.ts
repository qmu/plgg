import { SoftStr, Option } from "plgg";
import { SourceRange } from "plgg-ir-syntax";

/**
 * How many target records a relation reaches.
 */
export type Cardinality = "one" | "many";

/**
 * One entity relation of the canonical manifest IR
 * (design.md §7): the resolved target entity name,
 * cardinality, whether the link is required, and the
 * optional inverse relation name on the target —
 * verified to point back (design.md §16.5).
 */
export type Relation = Readonly<{
  name: SoftStr;
  target: SoftStr;
  cardinality: Cardinality;
  required: boolean;
  inverse: Option<SoftStr>;
  range: SourceRange;
  targetRange: SourceRange;
}>;

/**
 * Builds a {@link Relation}.
 */
export const relation = (
  name: SoftStr,
  target: SoftStr,
  cardinality: Cardinality,
  required: boolean,
  inverse: Option<SoftStr>,
  range: SourceRange,
  targetRange: SourceRange,
): Relation => ({
  name,
  target,
  cardinality,
  required,
  inverse,
  range,
  targetRange,
});
