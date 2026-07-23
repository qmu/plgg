import {
  PromisedResult,
  SoftStr,
  Defect,
  ok,
  err,
  proc,
  matchOption,
} from "plgg";
import {
  Db,
  Sql,
  SqlError,
  runScript,
  exec,
  transaction,
} from "plgg-sql";
import { Migration } from "plgg-db-migration/domain/model/Migration";
import { Migrator } from "plgg-db-migration/domain/model/Migrator";
import { versionString } from "plgg-db-migration/domain/model/Version";
import {
  MigrationError,
  irreversibleDown,
} from "plgg-db-migration/domain/model/MigrationError";
import {
  insertVersionSql,
  deleteVersionSql,
} from "plgg-db-migration/domain/usecase/dialectSql";

/**
 * Run a trusted `script` (an up/down body), then the ledger `record` SQL
 * (insert/delete the version) — fail-fast: the record runs only if the script
 * succeeded. Shared by apply and rollback so both paths exercise one branch set.
 */
const runThenRecord = (
  db: Db,
  script: SoftStr,
  record: Sql,
): PromisedResult<void, SqlError | Defect> =>
  proc(
    runScript(db)(script),
    () => exec(db)(record),
    () => ok(undefined),
  );

/**
 * Run `op` inside a `plgg-sql` transaction when `atomic`, else fail-forward.
 * Atomic iff the dialect supports transactional DDL AND the migration's section
 * is transactional (dbmate's `transaction:false` opts a section out). On MySQL
 * (no transactional DDL) a failed multi-statement section can half-apply — a
 * documented operational state, surfaced loudly on the next run by the version
 * primary key.
 */
const run = (
  migrator: Migrator,
  atomic: boolean,
  op: () => PromisedResult<void, SqlError | Defect>,
): PromisedResult<void, SqlError | Defect> =>
  atomic
    ? transaction(migrator.db, () => op())(
        undefined,
      )
    : op();

/**
 * Apply one migration: run its up body and record the version, atomically when
 * the dialect + migration allow.
 */
export const applyMigration =
  (migrator: Migrator) =>
  (
    m: Migration,
  ): PromisedResult<void, SqlError | Defect> =>
    run(
      migrator,
      migrator.dialect.supportsTransactionalDdl &&
        m.upTransaction,
      () =>
        runThenRecord(
          migrator.db,
          m.up,
          insertVersionSql(m.version),
        ),
    );

/**
 * Roll one migration back: run its down body and remove the version. A migration
 * with no down section (`None`) fails loudly with an `IrreversibleDown` error.
 */
export const rollbackMigration =
  (migrator: Migrator) =>
  (
    m: Migration,
  ): PromisedResult<
    void,
    MigrationError | SqlError | Defect
  > =>
    matchOption(
      (): PromisedResult<
        void,
        MigrationError | SqlError | Defect
      > =>
        Promise.resolve(
          err(
            irreversibleDown(
              `migration ${versionString(m.version)} has no down section`,
            ),
          ),
        ),
      (down: SoftStr) =>
        run(
          migrator,
          migrator.dialect
            .supportsTransactionalDdl &&
            m.downTransaction,
          () =>
            runThenRecord(
              migrator.db,
              down,
              deleteVersionSql(m.version),
            ),
        ),
    )(m.down);
