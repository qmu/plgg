import {
  Box,
  Bool,
  SoftStr,
  box,
  pattern,
  match,
} from "plgg";
import { Migration } from "plgg-db-migration";
import { SqliteType } from "plgg-domain/Domain/model/ColumnKind";

/**
 * A single way a persisted schema fails to satisfy the current {@link Domain}.
 * Pure tagged data (matched exhaustively, never inspected by `as`/`any`), so the
 * boot gate reports *why* it refuses to start rather than throwing. Two are
 * *recoverable* by a forward migration (a table or column is merely absent); two
 * are *irreconcilable* drift (a column's storage or the primary key conflicts).
 */
export type Mismatch =
  | Box<
      "MissingTable",
      Readonly<{ entity: SoftStr }>
    >
  | Box<
      "MissingColumn",
      Readonly<{
        entity: SoftStr;
        column: SoftStr;
      }>
    >
  | Box<
      "ColumnTypeMismatch",
      Readonly<{
        entity: SoftStr;
        column: SoftStr;
        expected: SqliteType;
        actual: SoftStr;
      }>
    >
  | Box<
      "PrimaryKeyMismatch",
      Readonly<{
        entity: SoftStr;
        expected: ReadonlyArray<SoftStr>;
        actual: ReadonlyArray<SoftStr>;
      }>
    >;

/** An entity has no table in the live database. */
export const missingTable = (
  entity: SoftStr,
): Mismatch => box("MissingTable")({ entity });

/** An entity's table lacks one of its columns. */
export const missingColumn = (
  entity: SoftStr,
  column: SoftStr,
): Mismatch =>
  box("MissingColumn")({ entity, column });

/** A live column's storage type is incompatible with the field's. */
export const columnTypeMismatch = (
  entity: SoftStr,
  column: SoftStr,
  expected: SqliteType,
  actual: SoftStr,
): Mismatch =>
  box("ColumnTypeMismatch")({
    entity,
    column,
    expected,
    actual,
  });

/** A live table's primary key differs from the entity's. */
export const primaryKeyMismatch = (
  entity: SoftStr,
  expected: ReadonlyArray<SoftStr>,
  actual: ReadonlyArray<SoftStr>,
): Mismatch =>
  box("PrimaryKeyMismatch")({
    entity,
    expected,
    actual,
  });

/** Matcher for a `MissingTable` mismatch. */
export const missingTable$ = () =>
  pattern("MissingTable")();

/** Matcher for a `MissingColumn` mismatch. */
export const missingColumn$ = () =>
  pattern("MissingColumn")();

/** Matcher for a `ColumnTypeMismatch` mismatch. */
export const columnTypeMismatch$ = () =>
  pattern("ColumnTypeMismatch")();

/** Matcher for a `PrimaryKeyMismatch` mismatch. */
export const primaryKeyMismatch$ = () =>
  pattern("PrimaryKeyMismatch")();

/**
 * Whether a mismatch can be repaired by a forward migration (an absent table or
 * column) rather than being irreconcilable drift (a storage or key conflict).
 * Exhaustive over the variants.
 */
export const isRecoverable = (
  mismatch: Mismatch,
): Bool =>
  match(mismatch)(
    [missingTable$(), (): Bool => true],
    [missingColumn$(), (): Bool => true],
    [
      columnTypeMismatch$(),
      (): Bool => false,
    ],
    [
      primaryKeyMismatch$(),
      (): Bool => false,
    ],
  );

/** A one-line human description of a mismatch for the boot-refusal message. */
export const describeMismatch = (
  mismatch: Mismatch,
): SoftStr =>
  match(mismatch)(
    [
      missingTable$(),
      ({ content }): SoftStr =>
        `missing table "${content.entity}"`,
    ],
    [
      missingColumn$(),
      ({ content }): SoftStr =>
        `missing column "${content.entity}.${content.column}"`,
    ],
    [
      columnTypeMismatch$(),
      ({ content }): SoftStr =>
        `column "${content.entity}.${content.column}" stores ${content.actual}, domain needs ${content.expected}`,
    ],
    [
      primaryKeyMismatch$(),
      ({ content }): SoftStr =>
        `primary key of "${content.entity}" is [${content.actual.join(", ")}], domain needs [${content.expected.join(", ")}]`,
    ],
  );

/**
 * The result of a schema-compatibility check. `SchemaOk` — the live schema
 * satisfies the domain; `SchemaLag` — it is behind but a returned {@link
 * Migration} brings it forward; `SchemaDrift` — irreconcilable, so a generated
 * shell must refuse to boot rather than corrupt the durable store.
 */
export type SchemaCheck =
  | Box<
      "SchemaOk",
      Readonly<{ domain: SoftStr }>
    >
  | Box<
      "SchemaLag",
      Readonly<{
        migration: Migration;
        mismatches: ReadonlyArray<Mismatch>;
      }>
    >
  | Box<
      "SchemaDrift",
      Readonly<{
        mismatches: ReadonlyArray<Mismatch>;
      }>
    >;

/** The live schema already satisfies the domain. */
export const schemaOk = (
  domain: SoftStr,
): SchemaCheck => box("SchemaOk")({ domain });

/** The live schema lags; run `migration` to bring it forward. */
export const schemaLag = (
  migration: Migration,
  mismatches: ReadonlyArray<Mismatch>,
): SchemaCheck =>
  box("SchemaLag")({ migration, mismatches });

/** The live schema conflicts irreconcilably; refuse to boot. */
export const schemaDrift = (
  mismatches: ReadonlyArray<Mismatch>,
): SchemaCheck =>
  box("SchemaDrift")({ mismatches });

/** Matcher for a `SchemaOk` result. */
export const schemaOk$ = () =>
  pattern("SchemaOk")();

/** Matcher for a `SchemaLag` result. */
export const schemaLag$ = () =>
  pattern("SchemaLag")();

/** Matcher for a `SchemaDrift` result. */
export const schemaDrift$ = () =>
  pattern("SchemaDrift")();
