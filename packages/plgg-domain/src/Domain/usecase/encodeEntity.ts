import {
  Result,
  Option,
  InvalidError,
  ok,
  err,
  none,
  pipe,
  mapResult,
  chainResult,
  matchOption,
  fromNullable,
  isOption,
  invalidError,
  hasProp,
} from "plgg";
import {
  Sql,
  SqlParam,
  SqlIdent,
  sql,
  identSql,
  sqlIdentString,
} from "plgg-sql";
import { Field } from "plgg-domain/Domain/model/Field";
import {
  Entity,
  DecodedRow,
} from "plgg-domain/Domain/model/Entity";

/** One column/parameter pair bound for an `INSERT`. */
export type Binding = Readonly<{
  column: SqlIdent;
  param: SqlParam;
}>;

/** Construct a {@link Binding}. */
const binding = (
  column: SqlIdent,
  param: SqlParam,
): Binding => ({ column, param });

/**
 * Read a nullable field's stored value as an `Option`. A value already wrapped
 * as an `Option` (as `decodeEntity` produces) is used as-is; a bare value is
 * lifted with `fromNullable` (as a JSON-reconstructed row supplies).
 */
const readOption = (
  row: DecodedRow,
  field: Field,
): Option<unknown> => {
  const key = sqlIdentString(field.name);
  return hasProp(row, key)
    ? isOption(row[key])
      ? row[key]
      : fromNullable(row[key])
    : none();
};

/** Bind one field to a column/param pair, honoring nullability. */
const bindField = (
  row: DecodedRow,
  field: Field,
): Result<Binding, InvalidError> => {
  const key = sqlIdentString(field.name);
  return field.nullable
    ? matchOption(
        (): Result<Binding, InvalidError> =>
          ok(binding(field.name, none())),
        (
          v: unknown,
        ): Result<Binding, InvalidError> =>
          pipe(
            field.encode(v),
            mapResult((p: SqlParam) =>
              binding(field.name, p),
            ),
          ),
      )(readOption(row, field))
    : hasProp(row, key)
      ? pipe(
          field.encode(row[key]),
          mapResult((p: SqlParam) =>
            binding(field.name, p),
          ),
        )
      : err(
          invalidError({
            message: `missing column "${key}" to encode`,
          }),
        );
};

/**
 * Encode a decoded row into ordered {@link Binding}s through the entity's field
 * encoders — the inverse of {@link decodeEntity}. A `None` nullable field binds
 * to SQL `NULL`; a failed encoder is an `InvalidError`.
 */
export const encodeEntity =
  (entity: Entity) =>
  (
    row: DecodedRow,
  ): Result<
    ReadonlyArray<Binding>,
    InvalidError
  > =>
    entity.fields.reduce<
      Result<ReadonlyArray<Binding>, InvalidError>
    >(
      (accR, field) =>
        chainResult(
          (acc: ReadonlyArray<Binding>) =>
            pipe(
              bindField(row, field),
              mapResult((b: Binding) => [
                ...acc,
                b,
              ]),
            ),
        )(accR),
      ok([]),
    );

/** Join SQL fragments with a separator fragment. */
const joinSql = (
  sep: Sql,
  parts: ReadonlyArray<Sql>,
): Sql =>
  parts.reduce(
    (acc, p, i) =>
      i === 0 ? p : sql`${acc}${sep}${p}`,
    sql``,
  );

/**
 * Build a parameterized `INSERT` for one row's bindings. Column names are
 * spliced as validated identifiers (`identSql`); values are bound as `?`
 * placeholders (or `NULL` for a `None` param), so the statement is
 * injection-safe by construction.
 */
export const insertSql = (
  entity: Entity,
  bindings: ReadonlyArray<Binding>,
): Sql =>
  sql`INSERT INTO ${identSql(
    entity.name,
  )} (${joinSql(
    sql`, `,
    bindings.map((b) => identSql(b.column)),
  )}) VALUES (${joinSql(
    sql`, `,
    bindings.map((b) => sql`${b.param}`),
  )})`;
