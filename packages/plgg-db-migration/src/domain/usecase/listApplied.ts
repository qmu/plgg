import {
  Obj,
  Result,
  PromisedResult,
  InvalidError,
  Defect,
  SoftStr,
  ok,
  err,
  proc,
  matchResult,
  cast,
  asObj,
  forProp,
  asSoftStr,
  invalidError,
  pipe,
  mapErr,
} from "plgg";
import {
  Db,
  SqlError,
  query,
  decodeRows,
} from "plgg-sql";
import {
  Version,
  asVersion,
} from "plgg-db-migration/domain/model/Version";
import { appliedVersion } from "plgg-db-migration/domain/model/AppliedVersion";
import { SchemaMigrations } from "plgg-db-migration/domain/model/SchemaMigrations";
import {
  MigrationError,
  ledgerCorrupt,
} from "plgg-db-migration/domain/model/MigrationError";
import { selectAppliedSql } from "plgg-db-migration/domain/usecase/dialectSql";

/** One decoded ledger row: a validated {@link Version} and its raw timestamp. */
type LedgerRow = Obj<{
  version: Version;
  applied_at: SoftStr;
}>;

/**
 * Decode a raw ledger row, branding the version. `asVersion`'s `MigrationError`
 * is mapped to the `InvalidError` channel `decodeRows` expects; the whole decode
 * failure is re-surfaced as a `LedgerCorrupt` `MigrationError` by `listApplied`.
 */
const asLedgerRow = (
  row: unknown,
): Result<LedgerRow, InvalidError> =>
  cast(
    row,
    asObj,
    forProp("version", (v: unknown) =>
      pipe(
        asVersion(v),
        mapErr(
          (e: MigrationError): InvalidError =>
            invalidError({
              message: e.content.message,
            }),
        ),
      ),
    ),
    forProp("applied_at", asSoftStr),
  );

/**
 * Read the applied versions from the `schema_migrations` ledger into a
 * {@link SchemaMigrations}. A driver failure folds to `SqlError`; a row that
 * cannot be decoded folds to a `LedgerCorrupt` `MigrationError`.
 */
export const listApplied = (
  db: Db,
): PromisedResult<
  SchemaMigrations,
  MigrationError | SqlError | Defect
> =>
  proc(
    query(db)(selectAppliedSql()),
    (rows) =>
      matchResult(
        (): Result<
          SchemaMigrations,
          MigrationError
        > =>
          err(
            ledgerCorrupt(
              "a schema_migrations row could not be decoded",
            ),
          ),
        (
          decoded: ReadonlyArray<LedgerRow>,
        ): Result<SchemaMigrations, MigrationError> =>
          ok(
            decoded.map((r) =>
              appliedVersion(
                r.version,
                r.applied_at,
              ),
            ),
          ),
      )(decodeRows(asLedgerRow)(rows)),
  );
