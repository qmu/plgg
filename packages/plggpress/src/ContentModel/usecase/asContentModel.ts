import {
  type Result,
  type InvalidError,
  isBox,
  icon,
  box,
  ok,
  err,
  invalidError,
  asSoftStr,
  asBool,
  asReadonlyArray,
  asObj,
  forProp,
  cast,
  isOk,
} from "plgg";
import {
  type FieldType,
  type Field,
  type ScalarKind,
  type ContentModel,
  type ContentModelBinding,
} from "plggpress/ContentModel/model/ContentModel";

const asScalarKind = (
  v: unknown,
): Result<ScalarKind, InvalidError> =>
  v === "text" || v === "number" || v === "boolean"
    ? ok(v)
    : err(
        invalidError({
          message: `scalar kind must be 'text'|'number'|'boolean', got ${JSON.stringify(v)}`,
        }),
      );

/**
 * The boundary caster for a declared field type — validates
 * an `unknown` (a loaded config's builder value) into a
 * {@link FieldType} by RECONSTRUCTION, so no `as` is
 * needed: a validated tag yields a fresh, valid value.
 */
export const asFieldType = (
  v: unknown,
): Result<FieldType, InvalidError> => {
  if (!isBox(v)) {
    return err(
      invalidError({
        message:
          "field type must be a plggpress field builder value",
      }),
    );
  }
  const tag = v.__tag;
  if (tag === "TextField") {
    return ok(icon("TextField"));
  }
  if (tag === "NumberField") {
    return ok(icon("NumberField"));
  }
  if (tag === "BooleanField") {
    return ok(icon("BooleanField"));
  }
  if (tag === "ListField") {
    const kind = asScalarKind(v.content);
    return isOk(kind)
      ? ok(box("ListField")(kind.content))
      : err(kind.content);
  }
  if (tag === "GroupField") {
    const fields = asReadonlyArray(asField)(
      v.content,
    );
    return isOk(fields)
      ? ok(box("GroupField")(fields.content))
      : err(fields.content);
  }
  return err(
    invalidError({
      message: `unknown field type ${JSON.stringify(tag)}`,
    }),
  );
};

/** The boundary caster for a declared {@link Field}. */
export const asField = (
  v: unknown,
): Result<Field, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("name", asSoftStr),
    forProp("type", asFieldType),
    forProp("required", asBool),
  );

/** The boundary caster for a {@link ContentModel}. */
export const asContentModel = (
  v: unknown,
): Result<ContentModel, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("name", asSoftStr),
    forProp("fields", asReadonlyArray(asField)),
  );

/** The boundary caster for a {@link ContentModelBinding}. */
export const asContentModelBinding = (
  v: unknown,
): Result<ContentModelBinding, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("prefix", asSoftStr),
    forProp("model", asContentModel),
  );

/** The boundary caster for the config's `models` list. */
export const asBindings = (
  v: unknown,
): Result<
  ReadonlyArray<ContentModelBinding>,
  InvalidError
> => asReadonlyArray(asContentModelBinding)(v);
