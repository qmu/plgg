import { SoftStr, Option } from "plgg";
import { SourceRange } from "plgg-ir-syntax";

/**
 * One concept (概念) — a state/world in the assertion's
 * finite Kripke model (design.md §2). Concepts are
 * introduced inline by name; the optional attributes are
 * the node-level annotations later passes read:
 * `:時点` (timestamp, temporal monotonicity, ticket 3),
 * `:量` (quantity, transfer conservation, ticket 3),
 * `:種` (stakeholder sort, sort exclusivity, ticket 3),
 * `:変換` (a transformation escape, exempt from transfer
 * conservation, ticket 3), and the inert `:重み`
 * (weight, v1 non-goal §5.13).
 */
export type Concept = Readonly<{
  name: SoftStr;
  at: Option<number>;
  quantity: Option<number>;
  sort: Option<SoftStr>;
  transform: boolean;
  weight: Option<number>;
  range: SourceRange;
}>;

/**
 * Builds a {@link Concept}.
 */
export const concept = (
  name: SoftStr,
  at: Option<number>,
  quantity: Option<number>,
  sort: Option<SoftStr>,
  transform: boolean,
  weight: Option<number>,
  range: SourceRange,
): Concept => ({
  name,
  at,
  quantity,
  sort,
  transform,
  weight,
  range,
});
