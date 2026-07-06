import {
  Result,
  Option,
  InvalidError,
  ok,
  err,
  some,
  none,
  pipe,
  mapResult,
  chainResult,
  matchOption,
  fromNullable,
  invalidError,
  hasProp,
} from "plgg";
import { sqlIdentString } from "plgg-sql";
import { Field } from "plgg-domain/Domain/model/Field";
import {
  Entity,
  DecodedRow,
} from "plgg-domain/Domain/model/Entity";

/**
 * A row from the driver is a non-null, non-array object — but its columns may be
 * SQL `NULL`, which `plgg`'s `asObj` rejects (a `null` is not a `Datum`). So the
 * row boundary uses this lighter check and lets each field's caster decide what a
 * `null` column means (a nullable field → `None`, a required field → failure).
 */
export const asRow = (
  value: unknown,
): Result<object, InvalidError> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value)
    ? ok(value)
    : err(
        invalidError({
          message: "expected a row object",
        }),
      );

/** Read a required column, failing loudly if absent. */
const readRequired = (
  obj: object,
  field: Field,
): Result<unknown, InvalidError> => {
  const key = sqlIdentString(field.name);
  return hasProp(obj, key)
    ? field.as(obj[key])
    : err(
        invalidError({
          message: `missing required column "${key}"`,
        }),
      );
};

/**
 * Read a nullable column. A missing key or SQL `NULL` (surfaced by the driver as
 * `null`/`undefined`) becomes `None`; a present value is cast and wrapped in
 * `Some`. `fromNullable` is the sanctioned boundary tool for the driver's raw
 * `null`.
 */
const readNullable = (
  obj: object,
  field: Field,
): Result<Option<unknown>, InvalidError> => {
  const key = sqlIdentString(field.name);
  return matchOption(
    (): Result<Option<unknown>, InvalidError> =>
      ok(none()),
    (
      raw: unknown,
    ): Result<Option<unknown>, InvalidError> =>
      pipe(field.as(raw), mapResult(some)),
  )(
    hasProp(obj, key)
      ? fromNullable(obj[key])
      : none(),
  );
};

/** Read one field's decoded value (an `Option` when the field is nullable). */
const readField = (
  obj: object,
  field: Field,
): Result<unknown, InvalidError> =>
  field.nullable
    ? readNullable(obj, field)
    : readRequired(obj, field);

/** Thread every entity invariant over an already-decoded row. */
const runInvariants =
  (entity: Entity) =>
  (
    row: DecodedRow,
  ): Result<DecodedRow, InvalidError> =>
    entity.invariants.reduce<
      Result<DecodedRow, InvalidError>
    >(
      (accR, inv) => chainResult(inv)(accR),
      ok(row),
    );

/**
 * Decode a raw persisted row back into the domain through the entity's field
 * casters, then check its invariants. This is the runtime half of the durable
 * boundary the boot gate checks statically: every value re-enters the domain
 * parse-don't-validate. Nullable columns decode to `Option`s; a missing required
 * column or a failed caster or invariant is an `InvalidError`, never a throw.
 */
export const decodeEntity =
  (entity: Entity) =>
  (
    row: unknown,
  ): Result<DecodedRow, InvalidError> =>
    pipe(
      asRow(row),
      chainResult((obj: object) =>
        entity.fields.reduce<
          Result<
            Record<string, unknown>,
            InvalidError
          >
        >(
          (accR, field) =>
            chainResult(
              (
                acc: Record<string, unknown>,
              ) =>
                pipe(
                  readField(obj, field),
                  mapResult(
                    (val: unknown) => ({
                      ...acc,
                      [sqlIdentString(
                        field.name,
                      )]: val,
                    }),
                  ),
                ),
            )(accR),
          ok({}),
        ),
      ),
      chainResult(runInvariants(entity)),
    );
