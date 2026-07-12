import {
  Box,
  SoftStr,
  box,
  pattern,
  match,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import {
  SemType,
  TypedExpr,
} from "plgg-ir-language";

/**
 * One dependency of a derived field — the edges of
 * the update-ordering graph (design.md §13): another
 * field's value, or a relation's membership (adding /
 * removing a member invalidates counts and sums).
 */
export type Dep = FieldDep | RelationDep;

/** Depends on a field's value. */
export type FieldDep = Box<
  "FieldDep",
  Readonly<{ entity: SoftStr; field: SoftStr }>
>;

/** Depends on a relation's membership. */
export type RelationDep = Box<
  "RelationDep",
  Readonly<{
    entity: SoftStr;
    relation: SoftStr;
    target: SoftStr;
  }>
>;

/** Builds a {@link FieldDep}. */
export const fieldDep = (
  entity: SoftStr,
  field: SoftStr,
): FieldDep => box("FieldDep")({ entity, field });

/** Builds a {@link RelationDep}. */
export const relationDep = (
  entity: SoftStr,
  relation: SoftStr,
  target: SoftStr,
): RelationDep =>
  box("RelationDep")({
    entity,
    relation,
    target,
  });

/** `match` pattern for a {@link FieldDep}. */
export const fieldDep$ = () =>
  pattern("FieldDep")();

/** `match` pattern for a {@link RelationDep}. */
export const relationDep$ = () =>
  pattern("RelationDep")();

/**
 * The entities a dependency touches (for consistency
 * compatibility, design.md §16.9).
 */
export const depEntities = (
  d: Dep,
): ReadonlyArray<SoftStr> =>
  match(d)(
    [
      fieldDep$(),
      ({ content }): ReadonlyArray<SoftStr> => [
        content.entity,
      ],
    ],
    [
      relationDep$(),
      ({ content }): ReadonlyArray<SoftStr> => [
        content.target,
      ],
    ],
  );

/**
 * How a derived field computes (design.md §6, §13):
 * a member count, a member-field sum, or a plain
 * expression over the entity's own reachable values.
 * Always declarative — the update ORDER is derived
 * from the dependency graph, never written by hand.
 */
export type Derivation =
  | CountDerivation
  | SumDerivation
  | ExprDerivation;

/** `(derive (count <relation-path>))`. */
export type CountDerivation = Box<
  "CountDerivation",
  Readonly<{
    relation: SoftStr;
    target: SoftStr;
    deps: ReadonlyArray<Dep>;
    range: SourceRange;
  }>
>;

/** `(derive (sum (children <relation> <field>)))`. */
export type SumDerivation = Box<
  "SumDerivation",
  Readonly<{
    relation: SoftStr;
    target: SoftStr;
    field: SoftStr;
    type: SemType;
    deps: ReadonlyArray<Dep>;
    range: SourceRange;
  }>
>;

/** `(derive <expression>)`. */
export type ExprDerivation = Box<
  "ExprDerivation",
  Readonly<{
    expr: TypedExpr;
    deps: ReadonlyArray<Dep>;
    range: SourceRange;
  }>
>;

/** Builds a {@link CountDerivation}. */
export const countDerivation = (
  relation: SoftStr,
  target: SoftStr,
  deps: ReadonlyArray<Dep>,
  range: SourceRange,
): CountDerivation =>
  box("CountDerivation")({
    relation,
    target,
    deps,
    range,
  });

/** Builds a {@link SumDerivation}. */
export const sumDerivation = (
  relation: SoftStr,
  target: SoftStr,
  field: SoftStr,
  type: SemType,
  deps: ReadonlyArray<Dep>,
  range: SourceRange,
): SumDerivation =>
  box("SumDerivation")({
    relation,
    target,
    field,
    type,
    deps,
    range,
  });

/** Builds an {@link ExprDerivation}. */
export const exprDerivation = (
  expr: TypedExpr,
  deps: ReadonlyArray<Dep>,
  range: SourceRange,
): ExprDerivation =>
  box("ExprDerivation")({ expr, deps, range });

/** `match` pattern for a {@link CountDerivation}. */
export const countDerivation$ = () =>
  pattern("CountDerivation")();

/** `match` pattern for a {@link SumDerivation}. */
export const sumDerivation$ = () =>
  pattern("SumDerivation")();

/** `match` pattern for an {@link ExprDerivation}. */
export const exprDerivation$ = () =>
  pattern("ExprDerivation")();

/**
 * The dependencies of any {@link Derivation}.
 */
export const derivationDeps = (
  d: Derivation,
): ReadonlyArray<Dep> =>
  match(d)(
    [
      countDerivation$(),
      ({ content }): ReadonlyArray<Dep> =>
        content.deps,
    ],
    [
      sumDerivation$(),
      ({ content }): ReadonlyArray<Dep> =>
        content.deps,
    ],
    [
      exprDerivation$(),
      ({ content }): ReadonlyArray<Dep> =>
        content.deps,
    ],
  );

/**
 * One derived field's identity in the dependency
 * graph.
 */
export type FieldRef = Readonly<{
  entity: SoftStr;
  field: SoftStr;
}>;

/**
 * Builds a {@link FieldRef}.
 */
export const fieldRef = (
  entity: SoftStr,
  field: SoftStr,
): FieldRef => ({ entity, field });
