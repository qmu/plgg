import {
  type SoftStr,
  type Box,
  type Icon,
  box,
  icon,
  pattern,
} from "plgg";

/**
 * A content model as DECLARATIVE DATA (D8) — the
 * MicroCMS "API"/collection analogue authors declare in
 * `site.config`, NOT a raw function (which would be opaque
 * to ticket 16's delivery API and D17's plugin export).
 * `casterOf` folds it into a caster; the delivery API
 * serves it; the plugin export introspects it.
 *
 * The `FieldType` is a closed sum consumed with exhaustive
 * `match`, bounded to the same one-level shape as the YAML
 * subset: a scalar (`text`/`number`/`boolean`), a `list`
 * of a scalar kind, or a `group` of scalar fields.
 */
export type ScalarKind =
  | "text"
  | "number"
  | "boolean";

export type FieldType =
  | Icon<"TextField">
  | Icon<"NumberField">
  | Icon<"BooleanField">
  | Box<"ListField", ScalarKind>
  | Box<"GroupField", ReadonlyArray<Field>>;

/** One declared field: a name, a type, and a required flag. */
export type Field = Readonly<{
  name: SoftStr;
  type: FieldType;
  required: boolean;
}>;

/** A named content model — an ordered set of fields. */
export type ContentModel = Readonly<{
  name: SoftStr;
  fields: ReadonlyArray<Field>;
}>;

/**
 * Attaches a {@link ContentModel} to a content-directory
 * PREFIX — the collection binding checkModels validates
 * every page under against.
 */
export type ContentModelBinding = Readonly<{
  prefix: SoftStr;
  model: ContentModel;
}>;

// --- builder helpers (the authoring surface) ----------

const field = (
  name: SoftStr,
  type: FieldType,
  required: boolean,
): Field => ({ name, type, required });

/** A text field (`required` defaults to true). */
export const textField = (
  name: SoftStr,
  required: boolean = true,
): Field => field(name, icon("TextField"), required);

/** A number field. */
export const numberField = (
  name: SoftStr,
  required: boolean = true,
): Field =>
  field(name, icon("NumberField"), required);

/** A boolean field. */
export const booleanField = (
  name: SoftStr,
  required: boolean = true,
): Field =>
  field(name, icon("BooleanField"), required);

/** A list-of-scalar field. */
export const listField = (
  name: SoftStr,
  kind: ScalarKind,
  required: boolean = true,
): Field =>
  field(name, box("ListField")(kind), required);

/** A group-of-scalar-fields field (one-level nesting). */
export const groupField = (
  name: SoftStr,
  fields: ReadonlyArray<Field>,
  required: boolean = true,
): Field =>
  field(
    name,
    box("GroupField")(fields),
    required,
  );

/** Constructs a {@link ContentModel}. */
export const contentModel = (
  name: SoftStr,
  fields: ReadonlyArray<Field>,
): ContentModel => ({ name, fields });

/** Binds a model to a content-directory prefix. */
export const bindModel = (
  prefix: SoftStr,
  model: ContentModel,
): ContentModelBinding => ({ prefix, model });

// --- matchers -----------------------------------------

export const textField$ = () =>
  pattern("TextField")();
export const numberField$ = () =>
  pattern("NumberField")();
export const booleanField$ = () =>
  pattern("BooleanField")();
export const listField$ = () =>
  pattern("ListField")();
export const groupField$ = () =>
  pattern("GroupField")();
