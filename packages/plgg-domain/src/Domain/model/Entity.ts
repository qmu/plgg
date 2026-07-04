import {
  Result,
  InvalidError,
  ok,
  err,
  pipe,
  fromNullable,
  getOr,
  mapResult,
  chainResult,
  invalidError,
} from "plgg";
import {
  SqlIdent,
  asSqlIdent,
  sqlIdentString,
} from "plgg-sql";
import {
  Field,
  FieldSpec,
  asField,
} from "plgg-domain/Domain/model/Field";

/**
 * A row after it has re-entered the domain through the entity's casters: every
 * present column has passed its `Field.as`, and nullable columns are `Option`s.
 * The static value type is `unknown` per column (the *runtime* validity is the
 * guarantee); ticket 17's content models layer concrete types on top.
 */
export type DecodedRow = Readonly<
  Record<string, unknown>
>;

/**
 * An entity-level, cross-field invariant: a total check over an already-decoded
 * row. Returns the row on success (so invariants compose) or an
 * `InvalidError` — never a throw.
 */
export type Invariant = (
  row: DecodedRow,
) => Result<DecodedRow, InvalidError>;

/**
 * One named entity of the durable core: a validated table name, an ordered set
 * of caster-typed {@link Field}s, and entity-level {@link Invariant}s. Authored
 * declaratively as an {@link EntitySpec} and validated once by {@link asEntity}.
 */
export type Entity = Readonly<{
  name: SqlIdent;
  fields: ReadonlyArray<Field>;
  invariants: ReadonlyArray<Invariant>;
}>;

/** A declarative entity description, validated by {@link asEntity}. */
export type EntitySpec = Readonly<{
  name: string;
  fields: ReadonlyArray<FieldSpec>;
  invariants?: ReadonlyArray<Invariant>;
}>;

/** Validate every field spec, gathering them into one `Result`. */
const sequenceFields = (
  specs: ReadonlyArray<FieldSpec>,
): Result<ReadonlyArray<Field>, InvalidError> =>
  specs.reduce<
    Result<ReadonlyArray<Field>, InvalidError>
  >(
    (accR, spec) =>
      chainResult(
        (acc: ReadonlyArray<Field>) =>
          pipe(
            asField(spec),
            mapResult((f: Field) => [
              ...acc,
              f,
            ]),
          ),
      )(accR),
    ok([]),
  );

/** An entity must declare at least one column. */
const ensureNonEmpty = (
  fields: ReadonlyArray<Field>,
): Result<ReadonlyArray<Field>, InvalidError> =>
  fields.length === 0
    ? err(
        invalidError({
          message:
            "an entity must declare at least one field",
        }),
      )
    : ok(fields);

/** Column names must be distinct within an entity. */
const ensureDistinct = (
  fields: ReadonlyArray<Field>,
): Result<ReadonlyArray<Field>, InvalidError> => {
  const names = fields.map((f) =>
    sqlIdentString(f.name),
  );
  return new Set(names).size === names.length
    ? ok(fields)
    : err(
        invalidError({
          message:
            "duplicate column name within an entity",
        }),
      );
};

/**
 * Validate an {@link EntitySpec} into an {@link Entity}: brand the table name,
 * validate every field, and reject an empty or duplicate-column entity. The
 * single construction point for an entity.
 */
export const asEntity = (
  spec: EntitySpec,
): Result<Entity, InvalidError> =>
  pipe(
    asSqlIdent(spec.name),
    chainResult((name: SqlIdent) =>
      pipe(
        sequenceFields(spec.fields),
        chainResult(ensureNonEmpty),
        chainResult(ensureDistinct),
        mapResult(
          (
            fields: ReadonlyArray<Field>,
          ): Entity => ({
            name,
            fields,
            invariants: pipe(
              fromNullable(spec.invariants),
              getOr<ReadonlyArray<Invariant>>(
                [],
              ),
            ),
          }),
        ),
      ),
    ),
  );

/** The primary-key fields of an entity, in declaration order. */
export const primaryKeyFields = (
  entity: Entity,
): ReadonlyArray<Field> =>
  entity.fields.filter((f) => f.primaryKey);
