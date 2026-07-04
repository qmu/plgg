import {
  Result,
  Option,
  Bool,
  SoftStr,
  Num,
  InvalidError,
  ok,
  some,
  none,
  pipe,
  fromNullable,
  getOr,
  matchOption,
  mapResult,
  chainResult,
  isBool,
  asSoftStr,
  asInt,
  asNum,
  asBool,
  asTime,
} from "plgg";
import {
  SqlParam,
  SqlIdent,
  asSqlIdent,
} from "plgg-sql";
import { ColumnKind } from "plgg-domain/Domain/model/ColumnKind";

/**
 * A JSON-safe scalar: exactly the values the canonical export writes. Aligns
 * with `plgg-sql`'s `SqlValue`, so a value that can be stored can be exported
 * and vice-versa.
 */
export type JsonScalar = SoftStr | Num | Bool;

/** A caster from an unknown value into a domain value. */
type Caster = (
  v: unknown,
) => Result<unknown, InvalidError>;

/**
 * A foreign-key reference from a {@link Field} to another entity's column. Both
 * identifiers are validated `SqlIdent`s, so the derived `FOREIGN KEY` DDL is
 * forgery-proof by construction.
 */
export type Reference = Readonly<{
  entity: SqlIdent;
  field: SqlIdent;
}>;

/**
 * One caster-typed, persistence-attributed column of the durable core. `as` is
 * the parse-don't-validate caster a persisted value re-enters the domain
 * through; `encode` lowers a domain value to a bound `SqlParam`; `toJson` lowers
 * it to a code-independent scalar for the canonical export. The `kind` fixes the
 * storage type and the three codec functions; a branded field keeps the base
 * `kind`'s storage while `as` refines further (e.g. an `Email` over `text`).
 */
export type Field = Readonly<{
  name: SqlIdent;
  kind: ColumnKind;
  as: Caster;
  encode: (
    v: unknown,
  ) => Result<SqlParam, InvalidError>;
  toJson: (
    v: unknown,
  ) => Result<JsonScalar, InvalidError>;
  primaryKey: Bool;
  nullable: Bool;
  unique: Bool;
  references: Option<Reference>;
}>;

/**
 * Read a boolean the way SQLite stores it: a native boolean, or the `1`/`0`
 * integers a driver returns for a boolean column (SQLite has no boolean type).
 * The strict `asBool` rejects `1`/`0`, so a `bool` field could not otherwise
 * round-trip through storage.
 */
const asStoredBool = (
  v: unknown,
): Result<Bool, InvalidError> =>
  isBool(v)
    ? ok(v)
    : v === 1
      ? ok(true)
      : v === 0
        ? ok(false)
        : asBool(v);

/** The three codec functions a {@link ColumnKind} supplies. */
type Codec = Readonly<{
  as: Caster;
  encode: (
    v: unknown,
  ) => Result<SqlParam, InvalidError>;
  toJson: (
    v: unknown,
  ) => Result<JsonScalar, InvalidError>;
}>;

/**
 * The per-kind codecs. Each reuses a plgg Atomic caster for `as`/`toJson` and
 * binds through the same caster for `encode`, so a value round-trips
 * domain → storage → JSON through one validated path. `time` is stored and
 * exported as an ISO-8601 string (`asTime` reads it back to a `Date`).
 */
const CODECS: Record<ColumnKind, Codec> = {
  text: {
    as: asSoftStr,
    encode: (v) =>
      pipe(asSoftStr(v), mapResult(some)),
    toJson: asSoftStr,
  },
  int: {
    as: asInt,
    encode: (v) =>
      pipe(asInt(v), mapResult(some)),
    toJson: asInt,
  },
  real: {
    as: asNum,
    encode: (v) =>
      pipe(asNum(v), mapResult(some)),
    toJson: asNum,
  },
  bool: {
    as: asStoredBool,
    encode: (v) =>
      pipe(asStoredBool(v), mapResult(some)),
    toJson: asStoredBool,
  },
  time: {
    as: asTime,
    encode: (v) =>
      pipe(
        asTime(v),
        mapResult((d) =>
          some(d.toISOString()),
        ),
      ),
    toJson: (v) =>
      pipe(
        asTime(v),
        mapResult((d) => d.toISOString()),
      ),
  },
};

/**
 * A declarative field description authored against the durable core. `name` and
 * `kind` are required; the flags default false; `brand` swaps in a refined
 * caster over the base `kind`; `references` names a foreign key. Validated in
 * one place by {@link asField}.
 */
export type FieldSpec = Readonly<{
  name: string;
  kind: ColumnKind;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  brand?: Caster;
  references?: Readonly<{
    entity: string;
    field: string;
  }>;
}>;

/**
 * Validate the optional `references` of a spec into an `Option<Reference>`,
 * branding both identifiers. Absent → `None`; present → both idents cast.
 */
const asReference = (
  spec: FieldSpec,
): Result<Option<Reference>, InvalidError> =>
  matchOption(
    (): Result<
      Option<Reference>,
      InvalidError
    > => ok(none()),
    (
      ref: Readonly<{
        entity: string;
        field: string;
      }>,
    ): Result<Option<Reference>, InvalidError> =>
      pipe(
        asSqlIdent(ref.entity),
        chainResult((entity: SqlIdent) =>
          pipe(
            asSqlIdent(ref.field),
            mapResult((field: SqlIdent) =>
              some({ entity, field }),
            ),
          ),
        ),
      ),
  )(fromNullable(spec.references));

/**
 * Validate a {@link FieldSpec} into a {@link Field}: brand the name as a
 * `SqlIdent`, pick the kind's codecs (refining `as` with `brand` when given),
 * and validate any foreign-key reference. The single construction point for a
 * field, so an invalid identifier can never reach schema derivation.
 */
export const asField = (
  spec: FieldSpec,
): Result<Field, InvalidError> =>
  pipe(
    asSqlIdent(spec.name),
    chainResult((name: SqlIdent) =>
      pipe(
        asReference(spec),
        mapResult(
          (
            references: Option<Reference>,
          ): Field => ({
            name,
            kind: spec.kind,
            as: pipe(
              fromNullable(spec.brand),
              getOr<Caster>(
                CODECS[spec.kind].as,
              ),
            ),
            encode: CODECS[spec.kind].encode,
            toJson: CODECS[spec.kind].toJson,
            primaryKey: pipe(
              fromNullable(spec.primaryKey),
              getOr(false),
            ),
            nullable: pipe(
              fromNullable(spec.nullable),
              getOr(false),
            ),
            unique: pipe(
              fromNullable(spec.unique),
              getOr(false),
            ),
            references,
          }),
        ),
      ),
    ),
  );

/** The underlying validated column name of a {@link Field}. */
export const fieldName = (
  field: Field,
): SqlIdent => field.name;
