import {
  Box,
  SoftStr,
  Option,
  box,
  pattern,
  fromNullable,
} from "plgg";

/**
 * The kind of a {@link MigrationError}: which migration-domain rule was
 * violated. A closed literal union so a fold over it is exhaustive.
 */
export type MigrationErrorKind =
  | "ParseFailure"
  | "OrderingViolation"
  | "IrreversibleDown"
  | "DialectMismatch"
  | "VersionShape"
  | "TenantShape"
  | "IoFailure"
  | "LedgerCorrupt"
  | "MissingMigration";

/**
 * A failure raised while reading, planning, or applying migrations. Pure tagged
 * data (a `Box`, not an `Error` subclass) so it rides the `Result`/`proc` error
 * channel like any plgg error, and unifies with `plgg-sql`'s `SqlError` as the
 * `E` of a shared `proc` chain. The `kind` discriminates the variant; `cause`
 * preserves an underlying throw when there is one (`None` otherwise).
 */
export type MigrationError = Box<
  "MigrationError",
  {
    kind: MigrationErrorKind;
    message: SoftStr;
    cause: Option<unknown>;
  }
>;

/**
 * Builds a {@link MigrationError} of one `kind`, lifting an optional thrown
 * cause into the `Option` channel.
 */
const make =
  (kind: MigrationErrorKind) =>
  (
    message: SoftStr,
    cause?: unknown,
  ): MigrationError =>
    box("MigrationError")({
      kind,
      message,
      cause: fromNullable(cause),
    });

/** A migration file could not be parsed (e.g. no `-- migrate:up` marker). */
export const parseFailure = make("ParseFailure");

/** The migrations directory has a duplicate or out-of-order version. */
export const orderingViolation = make(
  "OrderingViolation",
);

/** A rollback was requested for a migration with no `down` section. */
export const irreversibleDown = make(
  "IrreversibleDown",
);

/** A value did not match the selected SQL dialect's expectations. */
export const dialectMismatch = make(
  "DialectMismatch",
);

/** A migration version was not a 14-digit `YYYYMMDDHHMMSS` timestamp. */
export const versionShape = make("VersionShape");

/** A tenant identifier was not a non-empty string. */
export const tenantShape = make("TenantShape");

/** A filesystem operation (read dir, read/write file) failed. */
export const ioFailure = make("IoFailure");

/** A `schema_migrations` ledger row could not be decoded. */
export const ledgerCorrupt = make(
  "LedgerCorrupt",
);

/** An applied version has no corresponding migration file to roll back. */
export const missingMigration = make(
  "MissingMigration",
);

/**
 * Pattern matcher for folding a {@link MigrationError} with `match` by tag,
 * mirroring `plgg-sql`'s `sqlError$`.
 */
export const migrationError$ = () =>
  pattern("MigrationError")();
