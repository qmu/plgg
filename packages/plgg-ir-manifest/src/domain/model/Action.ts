import {
  Box,
  SoftStr,
  Option,
  box,
  pattern,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { TypedExpr } from "plgg-ir-language";
import { Field } from "plgg-ir-manifest/domain/model/Field";
import { ResolvedPath } from "plgg-ir-manifest/domain/model/Path";

/**
 * One `(set <path> <expr>)` effect: a subject-rooted,
 * updatable value path and the boolean-checked
 * assignment expression (design.md §12).
 */
export type Effect = Readonly<{
  target: ResolvedPath;
  value: TypedExpr;
  range: SourceRange;
}>;

/**
 * Builds an {@link Effect}.
 */
export const effect = (
  target: ResolvedPath,
  value: TypedExpr,
  range: SourceRange,
): Effect => ({ target, value, range });

/**
 * One `(ensure ...)` postcondition: either the
 * whole-entity validity assertion `(valid <subject>)`
 * or a boolean condition (design.md §12).
 */
export type Ensure = ValidEnsure | ExprEnsure;

/** `(ensure (valid <subject>))`. */
export type ValidEnsure = Box<
  "ValidEnsure",
  Readonly<{
    entity: SoftStr;
    range: SourceRange;
  }>
>;

/** `(ensure <boolean-expr>)`. */
export type ExprEnsure = Box<
  "ExprEnsure",
  Readonly<{
    condition: TypedExpr;
    range: SourceRange;
  }>
>;

/** Builds a {@link ValidEnsure}. */
export const validEnsure = (
  entity: SoftStr,
  range: SourceRange,
): ValidEnsure =>
  box("ValidEnsure")({ entity, range });

/** Builds an {@link ExprEnsure}. */
export const exprEnsure = (
  condition: TypedExpr,
  range: SourceRange,
): ExprEnsure =>
  box("ExprEnsure")({ condition, range });

/** `match` pattern for a {@link ValidEnsure}. */
export const validEnsure$ = () =>
  pattern("ValidEnsure")();

/** `match` pattern for an {@link ExprEnsure}. */
export const exprEnsure$ = () =>
  pattern("ExprEnsure")();

/**
 * One action of the canonical manifest IR (design.md
 * §12): a domain operation with a subject entity,
 * typed validated input, an authorization policy —
 * REQUIRED whenever the action has effects, because
 * no policy means denied (design.md §36.1) — effects,
 * and postconditions.
 */
export type Action = Readonly<{
  name: SoftStr;
  subject: SoftStr;
  inputs: ReadonlyArray<Field>;
  authorize: Option<SoftStr>;
  effects: ReadonlyArray<Effect>;
  ensures: ReadonlyArray<Ensure>;
  range: SourceRange;
}>;

/**
 * Builds an {@link Action}.
 */
export const action = (
  name: SoftStr,
  subject: SoftStr,
  inputs: ReadonlyArray<Field>,
  authorize: Option<SoftStr>,
  effects: ReadonlyArray<Effect>,
  ensures: ReadonlyArray<Ensure>,
  range: SourceRange,
): Action => ({
  name,
  subject,
  inputs,
  authorize,
  effects,
  ensures,
  range,
});
