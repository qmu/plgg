import {
  type SoftStr,
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  cast,
  asObj,
  asSoftStr,
  asBool,
  asReadonlyArray,
  forProp,
} from "plgg";

/**
 * The serializable field-type tag — the flat mirror of
 * ticket 17's `ContentModel` `FieldType`, reduced to a
 * plain string so a `CollectionSchema` round-trips through
 * JSON (the `collections.schema_json` column, the MicroCMS
 * schema endpoint, and D17 plugin introspection).
 * plgg-content stays plggpress-agnostic: plggpress maps its
 * `ContentModel` onto this shape at the boundary.
 */
export type SchemaFieldType =
  | "text"
  | "number"
  | "boolean"
  | "list"
  | "group";

/** One declared field in a {@link CollectionSchema}. */
export type SchemaField = Readonly<{
  name: SoftStr;
  type: SchemaFieldType;
  required: boolean;
}>;

/**
 * A registered collection's serializable schema — the
 * MicroCMS "API schema" a delivery consumer reads to know a
 * collection's typed custom attributes.
 */
export type CollectionSchema = Readonly<{
  name: SoftStr;
  fields: ReadonlyArray<SchemaField>;
}>;

/** Builds a {@link SchemaField}. */
export const schemaField = (
  name: SoftStr,
  type: SchemaFieldType,
  required: boolean,
): SchemaField => ({ name, type, required });

/** Builds a {@link CollectionSchema}. */
export const collectionSchema = (
  name: SoftStr,
  fields: ReadonlyArray<SchemaField>,
): CollectionSchema => ({ name, fields });

const asSchemaFieldType = (
  v: unknown,
): Result<SchemaFieldType, InvalidError> =>
  v === "text" ||
  v === "number" ||
  v === "boolean" ||
  v === "list" ||
  v === "group"
    ? ok(v)
    : err(
        invalidError({
          message: `unknown schema field type ${JSON.stringify(v)}`,
        }),
      );

/** Boundary caster for a {@link SchemaField}. */
export const asSchemaField = (
  v: unknown,
): Result<SchemaField, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("name", asSoftStr),
    forProp("type", asSchemaFieldType),
    forProp("required", asBool),
  );

/**
 * Boundary caster for a {@link CollectionSchema} — decodes a
 * `collections.schema_json` payload back to the domain type.
 */
export const asCollectionSchema = (
  v: unknown,
): Result<CollectionSchema, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("name", asSoftStr),
    forProp(
      "fields",
      asReadonlyArray(asSchemaField),
    ),
  );
