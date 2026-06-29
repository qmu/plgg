import { PromisedResult, ok, isOk } from "plgg";
import { SqlError } from "plgg-sql";
import { Migrator } from "plgg-db-migration/domain/model/Migrator";
import { Plan } from "plgg-db-migration/domain/model/Plan";
import { MigrationError } from "plgg-db-migration/domain/model/MigrationError";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { planMigrations } from "plgg-db-migration/domain/usecase/planMigrations";

/**
 * The current {@link Plan} — applied vs pending — for `status` / `--dry-run`.
 * Non-mutating with respect to user schema: it only ensures the (empty) ledger
 * exists so it can read it on a fresh database, then computes the pure diff. It
 * applies no migrations.
 */
export const status = (
  migrator: Migrator,
): PromisedResult<
  Plan,
  MigrationError | SqlError
> =>
  ensureSchemaMigrations(
    migrator.db,
    migrator.dialect,
  ).then((ensured) =>
    isOk(ensured)
      ? listApplied(migrator.db).then(
          (appliedRes) =>
            isOk(appliedRes)
              ? ok(
                  planMigrations(
                    migrator.dir,
                    appliedRes.content,
                  ),
                )
              : appliedRes,
        )
      : ensured,
  );
