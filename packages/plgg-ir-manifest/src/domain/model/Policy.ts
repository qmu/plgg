import { SoftStr } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { TypedExpr } from "plgg-ir-language";

/**
 * One authorization policy of the canonical manifest
 * IR (design.md §10): a named, boolean-typed `allows`
 * condition over the actor and the entity graph.
 * Enforcement is every consumer's duty on every
 * execution path; the default without a policy is
 * DENIED (design.md §36.1).
 */
export type Policy = Readonly<{
  name: SoftStr;
  allows: TypedExpr;
  range: SourceRange;
}>;

/**
 * Builds a {@link Policy}.
 */
export const policy = (
  name: SoftStr,
  allows: TypedExpr,
  range: SourceRange,
): Policy => ({ name, allows, range });
