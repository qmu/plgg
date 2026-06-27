import { Db } from "plgg-sql";
import { Dialect } from "plgg-db-migration/domain/model/Dialect";
import { MigrationDir } from "plgg-db-migration/domain/model/MigrationDir";

/**
 * The bound configuration the apply/rollback steps are partially applied over —
 * the `plgg-sql` `Db` seam, the selected {@link Dialect}, and the ordered
 * {@link MigrationDir} — mirroring `plgg-sql`'s config-first `query(db)` shape.
 */
export type Migrator = Readonly<{
  db: Db;
  dialect: Dialect;
  dir: MigrationDir;
}>;

/**
 * Constructs a {@link Migrator}.
 */
export const migrator = (
  db: Db,
  dialect: Dialect,
  dir: MigrationDir,
): Migrator => ({ db, dialect, dir });
