import { SoftStr, Option } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { TypedExpr } from "plgg-ir-language";
import { Field } from "plgg-ir-manifest/domain/model/Field";
import { Relation } from "plgg-ir-manifest/domain/model/Relation";

/**
 * One entity of the canonical manifest IR: resolved
 * fields and relations (member names unique per
 * entity), cross-field invariants (boolean-typed,
 * design.md §9), and the optional persistence table.
 */
export type Entity = Readonly<{
  name: SoftStr;
  table: Option<SoftStr>;
  fields: ReadonlyArray<Field>;
  relations: ReadonlyArray<Relation>;
  invariants: ReadonlyArray<TypedExpr>;
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
  range: SourceRange,
): Entity => ({
  name,
  table,
  fields,
  relations,
  invariants,
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
