import {
  type SoftStr,
  type PromisedResult,
  type Defect,
  ok,
  proc,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  exec,
} from "plgg-sql";

/**
 * Take a CONSISTENT hot backup of a served index (ticket 28,
 * the backup half of the runbook). Uses SQLite `VACUUM INTO`,
 * which snapshots a transactionally-consistent copy to
 * `destPath` WITHOUT stopping the writer — the D5 single-writer
 * served instance keeps serving during the drill. Restore is
 * just swapping the file in. `Result`, never a throw — a failed
 * backup (bad path, no space) is a typed `Err` an operator can
 * alert on. The path is bound, so it can't inject SQL.
 */
export const backupDatabase =
  (db: Db) =>
  (
    destPath: SoftStr,
  ): PromisedResult<
    null,
    SqlError | Defect
  > =>
    proc(
      exec(db)(sql`VACUUM INTO ${destPath}`),
      () => ok(null),
    );
