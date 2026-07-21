import { SoftStr, Option } from "plgg";
import {
  Sexp,
  SourceRange,
} from "plgg-ir-syntax";
import { Attack } from "plgg-ir-thesis/domain/model/Attack";

/**
 * One frame (フレーム) — a relation between whole
 * assertions (design.md §2): a declared simulation or
 * attack from its `:接続元` assertion to its `:接続先`
 * assertion. `kind` is its `:種別` (e.g. 反論); `require`
 * carries the raw `:要求` requirement expression
 * (`(遮断 前提→ルート)` / `(被覆 関係)`) that the model
 * checker parses and evaluates in ticket 4. `attacks`
 * are its declared `(攻撃 ...)` clauses.
 */
export type Frame = Readonly<{
  name: SoftStr;
  kind: Option<SoftStr>;
  from: SoftStr;
  to: SoftStr;
  require: Option<Sexp>;
  attacks: ReadonlyArray<Attack>;
  range: SourceRange;
}>;

/**
 * Builds a {@link Frame}.
 */
export const frame = (
  name: SoftStr,
  kind: Option<SoftStr>,
  from: SoftStr,
  to: SoftStr,
  require: Option<Sexp>,
  attacks: ReadonlyArray<Attack>,
  range: SourceRange,
): Frame => ({
  name,
  kind,
  from,
  to,
  require,
  attacks,
  range,
});
