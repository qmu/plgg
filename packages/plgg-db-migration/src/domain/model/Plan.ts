import { Migration } from "plgg-db-migration/domain/model/Migration";
import { AppliedVersion } from "plgg-db-migration/domain/model/AppliedVersion";

/**
 * The diff between the on-disk migrations and the database's recorded history:
 * the ordered `pending` up-migrations not yet applied, alongside the `applied`
 * ledger rows. Computed as a pure function (no I/O), so it is the data a
 * `status` / `--dry-run` preview renders without mutating anything. Rollback
 * targeting (the most-recent-applied migration, or down-to a version) is derived
 * by the rollback step from `applied` + the directory.
 */
export type Plan = Readonly<{
  pending: ReadonlyArray<Migration>;
  applied: ReadonlyArray<AppliedVersion>;
}>;

/**
 * Constructs a {@link Plan}.
 */
export const plan = (
  pending: ReadonlyArray<Migration>,
  applied: ReadonlyArray<AppliedVersion>,
): Plan => ({ pending, applied });
