import { SoftStr } from "plgg";
import { Db } from "plgg-sql";
import { Dialect } from "plgg-db-migration/domain/model/Dialect";

/**
 * The project configuration the CLI loads: the app-supplied `Db`, the selected
 * {@link Dialect}, and the path to the migrations directory. The package ships
 * no driver — the app constructs the `Db` and exports a `MigrateConfig` from its
 * config file.
 */
export type MigrateConfig = Readonly<{
  db: Db;
  dialect: Dialect;
  migrationsDir: SoftStr;
}>;

/**
 * Identity helper an app uses in its config file for type-checking:
 * `export default defineConfig({ db, dialect, migrationsDir })`.
 */
export const defineConfig = (
  config: MigrateConfig,
): MigrateConfig => config;
