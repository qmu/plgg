import { SoftStr, Option } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { LogicKind } from "plgg-ir-thesis/domain/model/LogicKind";

/**
 * One relation (関係) — a typed accessibility edge of the
 * assertion's Kripke model (design.md §2), from its
 * `:接続元` concept to its `:接続先` concept. A relation
 * may carry its own `:ロジック`; uniformity (design.md
 * §3) requires it to agree with the assertion's declared
 * kind. `:重み` is an inert v1 annotation (§5.13).
 */
export type Relation = Readonly<{
  name: SoftStr;
  from: SoftStr;
  to: SoftStr;
  logic: Option<LogicKind>;
  weight: Option<number>;
  range: SourceRange;
}>;

/**
 * Builds a {@link Relation}.
 */
export const relation = (
  name: SoftStr,
  from: SoftStr,
  to: SoftStr,
  logic: Option<LogicKind>,
  weight: Option<number>,
  range: SourceRange,
): Relation => ({
  name,
  from,
  to,
  logic,
  weight,
  range,
});
