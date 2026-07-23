import { SoftStr, Option } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { TypedExpr } from "plgg-ir-language";
import { Field } from "plgg-ir-manifest/domain/model/Field";
import { Relation } from "plgg-ir-manifest/domain/model/Relation";

/**
 * One `(read <policy>)` access rule.
 */
export type ReadAccess = Readonly<{
  policy: SoftStr;
  range: SourceRange;
}>;

/**
 * One `(update [<field>] <policy>)` access rule — a
 * whole-entity or per-field update policy.
 */
export type UpdateAccess = Readonly<{
  field: Option<SoftStr>;
  policy: SoftStr;
  range: SourceRange;
}>;

/**
 * An entity's `(access ...)` declaration (design.md
 * §10): read access and update access are separate —
 * visible does not mean mutable. No declaration means
 * DENIED at runtime (design.md §36.1); the compile-
 * time deny-by-default gate is on actions.
 */
export type Access = Readonly<{
  reads: ReadonlyArray<ReadAccess>;
  updates: ReadonlyArray<UpdateAccess>;
}>;

/**
 * The empty access declaration.
 */
export const noAccess = (): Access => ({
  reads: [],
  updates: [],
});

/**
 * One entity of the canonical manifest IR: resolved
 * fields and relations (member names unique per
 * entity), cross-field invariants (boolean-typed,
 * design.md §9), access policies, and the optional
 * persistence table.
 */
export type Entity = Readonly<{
  name: SoftStr;
  table: Option<SoftStr>;
  fields: ReadonlyArray<Field>;
  relations: ReadonlyArray<Relation>;
  invariants: ReadonlyArray<TypedExpr>;
  access: Access;
  range: SourceRange;
}>;

/**
 * Builds an {@link Entity}.
 */
export const entity = (
  name: SoftStr,
  table: Option<SoftStr>,
  fields: ReadonlyArray<Field>,
  relations: ReadonlyArray<Relation>,
  invariants: ReadonlyArray<TypedExpr>,
  access: Access,
  range: SourceRange,
): Entity => ({
  name,
  table,
  fields,
  relations,
  invariants,
  access,
  range,
});

/**
 * The relation named `name` on `e`, if declared.
 */
export const relationOf = (
  e: Entity,
  name: SoftStr,
): ReadonlyArray<Relation> =>
  e.relations.filter((r) => r.name === name);

/**
 * The field named `name` on `e`, if declared.
 */
export const fieldOf = (
  e: Entity,
  name: SoftStr,
): ReadonlyArray<Field> =>
  e.fields.filter((f) => f.name === name);
