import {
  Result,
  SoftStr,
  ok,
  err,
  isOk,
  hasProp,
  matchResult,
} from "plgg";
import { Db, SqlError } from "plgg-sql";
import {
  Dialect,
  DialectName,
} from "plgg-db-migration/domain/model/Dialect";
import {
  Version,
  versionString,
  asVersion,
} from "plgg-db-migration/domain/model/Version";
import { MigrationDir } from "plgg-db-migration/domain/model/MigrationDir";
import {
  Migrator,
  migrator,
} from "plgg-db-migration/domain/model/Migrator";
import { Plan } from "plgg-db-migration/domain/model/Plan";
import {
  MigrationError,
  parseFailure,
} from "plgg-db-migration/domain/model/MigrationError";
import { MigrateConfig } from "plgg-db-migration/domain/model/MigrateConfig";
import { readMigrations } from "plgg-db-migration/domain/usecase/readMigrations";
import { migrateUp } from "plgg-db-migration/domain/usecase/migrateUp";
import { migrateDown } from "plgg-db-migration/domain/usecase/migrateDown";
import { status } from "plgg-db-migration/domain/usecase/status";
import { newMigration } from "plgg-db-migration/domain/usecase/newMigration";

// The CLI is the framework edge: the only place `process`/`throw` live, and the
// typed counterpart to the plain-JS `bin/` launcher. The launcher owns the
// dynamic import of the user's config (so the bundler never sees a dynamic
// import) and passes the raw module in via `loadConfig`; this module validates
// it and turns a domain `Result` into a non-zero exit code. The domain stays
// Result-based throughout.

const DIALECT_NAMES: ReadonlyArray<DialectName> =
  ["sqlite", "postgres", "mysql"];

// A plain non-null object. NOT plgg's `isObj` — that requires every value to be
// a serializable `Datum`, which rejects a `Db` (its values are functions) and a
// config holding one.
const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFn = (value: unknown): boolean =>
  typeof value === "function";

/**
 * Real-validation guard for the app-supplied `Db`: every seam method must be a
 * function. (Backed by genuine runtime checks — a guard, not a type assertion.)
 */
const isDb = (value: unknown): value is Db =>
  isRecord(value) &&
  hasProp(value, "all") &&
  isFn(value.all) &&
  hasProp(value, "run") &&
  isFn(value.run) &&
  hasProp(value, "execScript") &&
  isFn(value.execScript) &&
  hasProp(value, "begin") &&
  isFn(value.begin) &&
  hasProp(value, "commit") &&
  isFn(value.commit) &&
  hasProp(value, "rollback") &&
  isFn(value.rollback);

const isDialect = (
  value: unknown,
): value is Dialect =>
  isRecord(value) &&
  hasProp(value, "name") &&
  typeof value.name === "string" &&
  DIALECT_NAMES.some((n) => n === value.name) &&
  hasProp(value, "supportsTransactionalDdl") &&
  typeof value.supportsTransactionalDdl ===
    "boolean";

/** Validate a dynamically-imported config into a {@link MigrateConfig}. */
const asMigrateConfig = (
  value: unknown,
): Result<MigrateConfig, MigrationError> =>
  isRecord(value) &&
  hasProp(value, "db") &&
  isDb(value.db) &&
  hasProp(value, "dialect") &&
  isDialect(value.dialect) &&
  hasProp(value, "migrationsDir") &&
  typeof value.migrationsDir === "string"
    ? ok({
        db: value.db,
        dialect: value.dialect,
        migrationsDir: value.migrationsDir,
      })
    : err(
        parseFailure(
          "invalid config: expected a default export { db, dialect, migrationsDir }",
        ),
      );

/**
 * A module's `default` export, tolerating a module that is itself the config.
 * Uses a raw `typeof` check (not `isObj`) because an ESM module namespace is an
 * exotic object `isObj` rejects.
 */
const pickDefault = (mod: unknown): unknown =>
  typeof mod === "object" &&
  mod !== null &&
  hasProp(mod, "default")
    ? mod.default
    : mod;

/** Print an error and set a non-zero exit code. */
const fail = (message: SoftStr): void => {
  process.stderr.write(
    `plgg-db-migration: ${message}\n`,
  );
  process.exitCode = 1;
};

/** Print a success line. */
const done = (message: SoftStr): void => {
  process.stdout.write(`${message}\n`);
};

/** The message of any error riding this CLI's channel. */
const messageOf = (
  e: MigrationError | SqlError,
): SoftStr => e.content.message;

/** Fold a domain result into stdout / exit-code. */
const render = <T>(
  result: Result<T, MigrationError | SqlError>,
  onOk: (value: T) => SoftStr,
): void =>
  matchResult(
    (e: MigrationError | SqlError): void =>
      fail(messageOf(e)),
    (value: T): void => done(onOk(value)),
  )(result);

const listVersions = (
  versions: ReadonlyArray<Version>,
): SoftStr =>
  versions.length === 0
    ? ""
    : `: ${versions
        .map(versionString)
        .join(", ")}`;

const renderPlan = (plan: Plan): SoftStr =>
  `${plan.pending.length} pending${listVersions(
    plan.pending.map((m) => m.version),
  )} · ${plan.applied.length} applied`;

/** Build a Migrator from the config (read + validate the migrations dir). */
const buildMigrator = (
  config: MigrateConfig,
): Promise<Result<Migrator, MigrationError>> =>
  readMigrations(config.migrationsDir).then(
    (dirRes) =>
      matchResult(
        (
          e: MigrationError,
        ): Result<Migrator, MigrationError> =>
          err(e),
        (dir: MigrationDir) =>
          ok(
            migrator(
              config.db,
              config.dialect,
              dir,
            ),
          ),
      )(dirRes),
  );

const runNew = async (
  config: MigrateConfig,
  name: SoftStr | undefined,
): Promise<void> =>
  name === undefined
    ? fail("usage: new <name>")
    : render(
        await newMigration(
          config.migrationsDir,
          name,
          new Date(),
        ),
        (path) => `created ${path}`,
      );

const runUp = async (
  config: MigrateConfig,
  dryRun: boolean,
): Promise<void> => {
  const built = await buildMigrator(config);
  return isOk(built)
    ? dryRun
      ? render(
          await status(built.content),
          (plan) =>
            `up --dry-run: ${renderPlan(plan)}`,
        )
      : render(
          await migrateUp(built.content),
          (vs) =>
            `applied ${vs.length} migration(s)${listVersions(vs)}`,
        )
    : fail(messageOf(built.content));
};

const runDown = async (
  config: MigrateConfig,
  dryRun: boolean,
  toArg: SoftStr | undefined,
): Promise<void> => {
  const built = await buildMigrator(config);
  if (!isOk(built)) {
    return fail(messageOf(built.content));
  }
  const parsedTo =
    toArg === undefined
      ? ok(undefined)
      : asVersion(toArg);
  return isOk(parsedTo)
    ? dryRun
      ? render(
          await status(built.content),
          (plan) =>
            `down --dry-run: ${renderPlan(plan)}`,
        )
      : render(
          await migrateDown(
            built.content,
            parsedTo.content,
          ),
          (vs) =>
            `rolled back ${vs.length} migration(s)${listVersions(vs)}`,
        )
    : fail(`invalid --to version: ${toArg}`);
};

const runStatus = async (
  config: MigrateConfig,
): Promise<void> => {
  const built = await buildMigrator(config);
  return isOk(built)
    ? render(
        await status(built.content),
        renderPlan,
      )
    : fail(messageOf(built.content));
};

const argValue = (
  argv: ReadonlyArray<SoftStr>,
  flag: SoftStr,
): SoftStr | undefined => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

/** Load + validate the config (via the injected loader), then run `fn`. */
const withConfig = async (
  loadConfig: () => Promise<unknown>,
  fn: (config: MigrateConfig) => Promise<void>,
): Promise<void> => {
  const config = asMigrateConfig(
    pickDefault(await loadConfig()),
  );
  return isOk(config)
    ? fn(config.content)
    : fail(messageOf(config.content));
};

/**
 * CLI entry point — invoked by the `bin/` launcher with a `loadConfig` that
 * dynamically imports the user's config module and the process `argv`.
 */
export const run = async (
  loadConfig: () => Promise<unknown>,
  argv: ReadonlyArray<SoftStr>,
): Promise<void> => {
  const command = argv[2];
  const args = argv.slice(3);
  const dryRun = args.includes("--dry-run");
  const positional = args.find(
    (a) => !a.startsWith("--"),
  );
  try {
    return command === "new"
      ? await withConfig(loadConfig, (c) =>
          runNew(c, positional),
        )
      : command === "up"
        ? await withConfig(loadConfig, (c) =>
            runUp(c, dryRun),
          )
        : command === "down"
          ? await withConfig(loadConfig, (c) =>
              runDown(
                c,
                dryRun,
                argValue(args, "--to"),
              ),
            )
          : command === "status"
            ? await withConfig(
                loadConfig,
                runStatus,
              )
            : fail(
                `unknown command: ${command ?? "(none)"} (expected new | up | down | status)`,
              );
  } catch (e) {
    fail(
      e instanceof Error ? e.message : String(e),
    );
  }
};
