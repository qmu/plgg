import {
  type Datum,
  type Obj,
  type Result,
  type InvalidError,
  asObj,
  asSoftStr,
  asNum,
  asBool,
  asReadonlyArray,
  forProp,
  forOptionProp,
  chainResult,
  match,
} from "plgg";
import {
  type ContentModel,
  type FieldType,
  type Field,
  type ScalarKind,
  contentModel,
  textField$,
  numberField$,
  booleanField$,
  listField$,
  groupField$,
} from "plggpress/ContentModel/model/ContentModel";

/** The caster for one scalar kind. */
const scalarCaster = (
  kind: ScalarKind,
): ((v: unknown) => Result<Datum, InvalidError>) =>
  kind === "text"
    ? asSoftStr
    : kind === "number"
      ? asNum
      : asBool;

/** The caster for a field's declared type (exhaustive). */
const typeCaster = (
  type: FieldType,
): ((v: unknown) => Result<Datum, InvalidError>) =>
  match(type)(
    [
      textField$(),
      (): ((
        v: unknown,
      ) => Result<Datum, InvalidError>) =>
        asSoftStr,
    ],
    [
      numberField$(),
      (): ((
        v: unknown,
      ) => Result<Datum, InvalidError>) => asNum,
    ],
    [
      booleanField$(),
      (): ((
        v: unknown,
      ) => Result<Datum, InvalidError>) => asBool,
    ],
    [
      listField$(),
      ({
        content,
      }): ((
        v: unknown,
      ) => Result<Datum, InvalidError>) =>
        asReadonlyArray(scalarCaster(content)),
    ],
    [
      groupField$(),
      ({
        content,
      }): ((
        v: unknown,
      ) => Result<Datum, InvalidError>) =>
        casterOf(
          contentModel("group", content),
        ),
    ],
  );

/**
 * The caster-backed half of D8: folds a {@link ContentModel}
 * into a `(value: unknown) => Result<…, InvalidError>`
 * caster built from the ORDINARY plgg primitives
 * (`asObj`/`forProp`/`forOptionProp`/`asReadonlyArray`),
 * so a page's folded frontmatter is validated with the
 * SAME vocabulary that validates `site.config`. Required
 * fields use `forProp` (absence is an error), optional
 * fields `forOptionProp` (absence is allowed). Total —
 * every mismatch is an `Err` naming the field.
 */
export const casterOf =
  (model: ContentModel) =>
  (value: unknown): Result<Obj, InvalidError> =>
    model.fields.reduce<
      Result<Obj, InvalidError>
    >(
      (acc, f: Field) =>
        chainResult(
          f.required
            ? forProp(
                f.name,
                typeCaster(f.type),
              )
            : forOptionProp(
                f.name,
                typeCaster(f.type),
              ),
        )(acc),
      asObj(value),
    );
