import { Box, SoftStr, box, pattern } from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { SemType } from "plgg-ir-language";
import { Field } from "plgg-ir-manifest/domain/model/Field";
import { Cardinality } from "plgg-ir-manifest/domain/model/Relation";
import { Projection } from "plgg-ir-manifest/domain/model/Projection";

/**
 * One root a dotted path may start from — the
 * namespaces the manifest exposes to expressions and
 * layouts (design.md §14–15): an entity alias (a view
 * subject, a list element), a field bag (`input`), the
 * `actor`, or a projection alias introduced by
 * `lookup`.
 */
export type PathRoot =
  | EntityRoot
  | FieldsRoot
  | ActorRoot
  | ProjectionRoot;

/** An alias rooted at an entity (subject, element). */
export type EntityRoot = Box<
  "EntityRoot",
  Readonly<{ name: SoftStr; entity: SoftStr }>
>;

/** A bag of fields (`input.<field>`). */
export type FieldsRoot = Box<
  "FieldsRoot",
  Readonly<{
    name: SoftStr;
    fields: ReadonlyArray<Field>;
  }>
>;

/**
 * The requesting actor: `actor.<f>` types as the
 * nominal type `<f>` (the same name-is-type
 * convention view parameters use).
 */
export type ActorRoot = Box<
  "ActorRoot",
  Readonly<{ name: SoftStr }>
>;

/**
 * A projection alias from `(lookup <projection>
 * (through ...))`: only the projected fields are
 * reachable (design.md §15).
 */
export type ProjectionRoot = Box<
  "ProjectionRoot",
  Readonly<{
    name: SoftStr;
    projection: Projection;
  }>
>;

/** Builds an {@link EntityRoot}. */
export const entityRoot = (
  name: SoftStr,
  entity: SoftStr,
): EntityRoot =>
  box("EntityRoot")({ name, entity });

/** Builds a {@link FieldsRoot}. */
export const fieldsRoot = (
  name: SoftStr,
  fields: ReadonlyArray<Field>,
): FieldsRoot =>
  box("FieldsRoot")({ name, fields });

/** Builds an {@link ActorRoot}. */
export const actorRoot = (
  name: SoftStr,
): ActorRoot => box("ActorRoot")({ name });

/** Builds a {@link ProjectionRoot}. */
export const projectionRoot = (
  name: SoftStr,
  projection: Projection,
): ProjectionRoot =>
  box("ProjectionRoot")({ name, projection });

/** `match` pattern for an {@link EntityRoot}. */
export const entityRoot$ = () =>
  pattern("EntityRoot")();

/** `match` pattern for a {@link FieldsRoot}. */
export const fieldsRoot$ = () =>
  pattern("FieldsRoot")();

/** `match` pattern for an {@link ActorRoot}. */
export const actorRoot$ = () =>
  pattern("ActorRoot")();

/** `match` pattern for a {@link ProjectionRoot}. */
export const projectionRoot$ = () =>
  pattern("ProjectionRoot")();

/**
 * What a resolved path ends at: a scalar value or an
 * entity (a relation endpoint).
 */
export type PathTerminal =
  ValueTerminal | EntityTerminal;

/** The path ends at a field value. */
export type ValueTerminal = Box<
  "ValueTerminal",
  Readonly<{ type: SemType }>
>;

/** The path ends at an entity via relations. */
export type EntityTerminal = Box<
  "EntityTerminal",
  Readonly<{
    entity: SoftStr;
    cardinality: Cardinality;
  }>
>;

/** Builds a {@link ValueTerminal}. */
export const valueTerminal = (
  type: SemType,
): ValueTerminal =>
  box("ValueTerminal")({ type });

/** Builds an {@link EntityTerminal}. */
export const entityTerminal = (
  entity: SoftStr,
  cardinality: Cardinality,
): EntityTerminal =>
  box("EntityTerminal")({ entity, cardinality });

/** Type guard: is this a {@link ValueTerminal}? */
export const isValueTerminal = (
  t: PathTerminal,
): t is ValueTerminal =>
  t.__tag === "ValueTerminal";

/** Type guard: is this an {@link EntityTerminal}? */
export const isEntityTerminal = (
  t: PathTerminal,
): t is EntityTerminal =>
  t.__tag === "EntityTerminal";

/**
 * One relation hop a path crossed: its full dotted
 * text (for query-scope membership) and the entity it
 * reaches (for aggregate-boundary checks).
 */
export type PathPrefix = Readonly<{
  text: SoftStr;
  entity: SoftStr;
}>;

/**
 * One fully resolved dotted path
 * (`task.project.client`): its text, the relation
 * prefixes it crossed, whether any hop had `many`
 * cardinality, and its terminal.
 */
export type ResolvedPath = Readonly<{
  text: SoftStr;
  root: SoftStr;
  prefixes: ReadonlyArray<PathPrefix>;
  throughMany: boolean;
  terminal: PathTerminal;
  range: SourceRange;
}>;

/**
 * Builds a {@link ResolvedPath}.
 */
export const resolvedPath = (
  text: SoftStr,
  root: SoftStr,
  prefixes: ReadonlyArray<PathPrefix>,
  throughMany: boolean,
  terminal: PathTerminal,
  range: SourceRange,
): ResolvedPath => ({
  text,
  root,
  prefixes,
  throughMany,
  terminal,
  range,
});
