import {
  type Result,
  type Option,
  type SoftStr,
  type Int,
  type InvalidError,
  type Defect,
  type PromisedResult,
  ok,
  some,
  pipe,
  proc,
  match,
  mapResult,
  chainResult,
  matchOption,
  fromNullable,
  asSoftStr,
  asInt,
  forProp,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  identSql,
  query,
  decodeRows,
  sqlIdentString,
  type SqlIdent,
} from "plgg-sql";
import {
  type Version,
  type Migration,
  migration,
} from "plgg-db-migration";
import {
  type Domain,
  type Entity,
  type Field,
  primaryKeyFields,
} from "plgg-cms/domainCore/Domain/model";
import {
  type Mismatch,
  type SchemaCheck,
  missingTable,
  missingColumn,
  columnTypeMismatch,
  primaryKeyMismatch,
  missingTable$,
  missingColumn$,
  columnTypeMismatch$,
  primaryKeyMismatch$,
  isRecoverable,
  schemaOk,
  schemaLag,
  schemaDrift,
} from "plgg-cms/domainCore/Domain/model/Mismatch";
import {
  sqliteType,
  typeAffinity,
} from "plgg-cms/domainCore/Domain/model/ColumnKind";
import { createTableDdl } from "plgg-cms/domainCore/Domain/usecase/schemaOf";
import { asRow } from "plgg-cms/domainCore/Domain/usecase/decodeEntity";

/** The error channel of every introspection step. */
type CheckError =
  | SqlError
  | InvalidError
  | Defect;

/** One introspected column from `PRAGMA table_info`. */
type ColumnInfo = Readonly<{
  name: SoftStr;
  type: SoftStr;
  notnull: Int;
  pk: Int;
}>;

/** Decode a `sqlite_master` name row. */
const asNameRow = (
  row: unknown,
): Result<
  Readonly<{ name: SoftStr }>,
  InvalidError
> =>
  pipe(
    asRow(row),
    chainResult(forProp("name", asSoftStr)),
  );

/** Decode a `PRAGMA table_info` row. */
const asColumnInfo = (
  row: unknown,
): Result<ColumnInfo, InvalidError> =>
  pipe(
    asRow(row),
    chainResult(forProp("name", asSoftStr)),
    chainResult(forProp("type", asSoftStr)),
    chainResult(forProp("notnull", asInt)),
    chainResult(forProp("pk", asInt)),
  );

/** The live table names of the database. */
const tableNames = (
  db: Db,
): PromisedResult<
  ReadonlyArray<SoftStr>,
  CheckError
> =>
  proc(
    query(db)(
      sql`SELECT name FROM sqlite_master WHERE type = 'table'`,
    ),
    (rows) => decodeRows(asNameRow)(rows),
    (named) => ok(named.map((r) => r.name)),
  );

/** Whether two ordered name lists are element-wise equal. */
const sameNames = (
  a: ReadonlyArray<SoftStr>,
  b: ReadonlyArray<SoftStr>,
): boolean =>
  a.length === b.length &&
  a.every((n, i) => n === b[i]);

/** Column-level mismatches: missing columns and storage-type conflicts. */
const columnMismatches = (
  entity: Entity,
  cols: ReadonlyArray<ColumnInfo>,
): ReadonlyArray<Mismatch> =>
  entity.fields.flatMap((f) =>
    matchOption(
      (): ReadonlyArray<Mismatch> => [
        missingColumn(
          sqlIdentString(entity.name),
          sqlIdentString(f.name),
        ),
      ],
      (
        col: ColumnInfo,
      ): ReadonlyArray<Mismatch> =>
        typeAffinity(col.type) ===
        sqliteType(f.kind)
          ? []
          : [
              columnTypeMismatch(
                sqlIdentString(entity.name),
                sqlIdentString(f.name),
                sqliteType(f.kind),
                col.type,
              ),
            ],
    )(
      fromNullable(
        cols.find(
          (c) =>
            c.name === sqlIdentString(f.name),
        ),
      ),
    ),
  );

/** Primary-key mismatch, when the entity declares a key. */
const primaryKeyMismatches = (
  entity: Entity,
  cols: ReadonlyArray<ColumnInfo>,
): ReadonlyArray<Mismatch> => {
  const expected = primaryKeyFields(entity).map(
    (f) => sqlIdentString(f.name),
  );
  const actual = [...cols]
    .filter((c) => c.pk > 0)
    .sort((a, b) => a.pk - b.pk)
    .map((c) => c.name);
  return expected.length === 0 ||
    sameNames(expected, actual)
    ? []
    : [
        primaryKeyMismatch(
          sqlIdentString(entity.name),
          expected,
          actual,
        ),
      ];
};

/** `PRAGMA table_info(<table>)` for a validated identifier. */
const pragmaTableInfo = (name: SqlIdent) =>
  sql`PRAGMA table_info(${identSql(name)})`;

/** Check one entity against the live database. */
const checkEntity = (
  db: Db,
  entity: Entity,
  tables: ReadonlyArray<SoftStr>,
): PromisedResult<
  ReadonlyArray<Mismatch>,
  CheckError
> =>
  tables.includes(sqlIdentString(entity.name))
    ? proc(
        query(db)(pragmaTableInfo(entity.name)),
        (rows) => decodeRows(asColumnInfo)(rows),
        (cols: ReadonlyArray<ColumnInfo>) =>
          ok([
            ...columnMismatches(entity, cols),
            ...primaryKeyMismatches(
              entity,
              cols,
            ),
          ]),
      )
    : Promise.resolve(
        ok([
          missingTable(
            sqlIdentString(entity.name),
          ),
        ]),
      );

/** Gather every checked-Result into one Result of all mismatches. */
const flatten = (
  results: ReadonlyArray<
    Result<ReadonlyArray<Mismatch>, CheckError>
  >,
): Result<ReadonlyArray<Mismatch>, CheckError> =>
  results.reduce<
    Result<ReadonlyArray<Mismatch>, CheckError>
  >(
    (accR, r) =>
      chainResult(
        (acc: ReadonlyArray<Mismatch>) =>
          pipe(
            r,
            mapResult(
              (
                ms: ReadonlyArray<Mismatch>,
              ) => [...acc, ...ms],
            ),
          ),
      )(accR),
    ok([]),
  );

/** Check every entity concurrently and flatten the mismatches. */
const checkAllEntities = (
  db: Db,
  domain: Domain,
  tables: ReadonlyArray<SoftStr>,
): PromisedResult<
  ReadonlyArray<Mismatch>,
  CheckError
> =>
  proc(
    Promise.all(
      domain.entities.map((e) =>
        checkEntity(db, e, tables),
      ),
    ),
    (
      results: ReadonlyArray<
        Result<
          ReadonlyArray<Mismatch>,
          CheckError
        >
      >,
    ) => flatten(results),
  );

/** Find an entity by its raw table name. */
const findEntity = (
  domain: Domain,
  name: SoftStr,
): Option<Entity> =>
  fromNullable(
    domain.entities.find(
      (e) => sqlIdentString(e.name) === name,
    ),
  );

/** Forward DDL to create a missing table. */
const tableUp = (
  domain: Domain,
  name: SoftStr,
): ReadonlyArray<SoftStr> =>
  matchOption(
    (): ReadonlyArray<SoftStr> => [],
    (e: Entity): ReadonlyArray<SoftStr> => [
      createTableDdl(e),
    ],
  )(findEntity(domain, name));

/**
 * Forward DDL to add a missing column. Added permissively (no `NOT NULL`, so an
 * `ALTER TABLE ... ADD COLUMN` is runnable against populated tables); the field
 * caster still enforces the domain constraint on decode.
 */
const columnUp = (
  domain: Domain,
  entityName: SoftStr,
  columnName: SoftStr,
): ReadonlyArray<SoftStr> =>
  matchOption(
    (): ReadonlyArray<SoftStr> => [],
    (e: Entity): ReadonlyArray<SoftStr> =>
      matchOption(
        (): ReadonlyArray<SoftStr> => [],
        (f: Field): ReadonlyArray<SoftStr> => [
          `ALTER TABLE ${entityName} ADD COLUMN ${sqlIdentString(
            f.name,
          )} ${sqliteType(f.kind)};`,
        ],
      )(
        fromNullable(
          e.fields.find(
            (f) =>
              sqlIdentString(f.name) ===
              columnName,
          ),
        ),
      ),
  )(findEntity(domain, entityName));

/** The additive `up` DDL for one recoverable mismatch. */
const additiveUp = (
  domain: Domain,
  m: Mismatch,
): ReadonlyArray<SoftStr> =>
  match(m)(
    [
      missingTable$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        tableUp(domain, content.entity),
    ],
    [
      missingColumn$(),
      ({ content }): ReadonlyArray<SoftStr> =>
        columnUp(
          domain,
          content.entity,
          content.column,
        ),
    ],
    [
      columnTypeMismatch$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
    [
      primaryKeyMismatch$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
  );

/** The `down` DDL undoing one recoverable mismatch's `up`. */
const additiveDown = (
  m: Mismatch,
): ReadonlyArray<SoftStr> =>
  match(m)(
    [
      missingTable$(),
      ({ content }): ReadonlyArray<SoftStr> => [
        `DROP TABLE IF EXISTS ${content.entity};`,
      ],
    ],
    [
      missingColumn$(),
      ({ content }): ReadonlyArray<SoftStr> => [
        `ALTER TABLE ${content.entity} DROP COLUMN ${content.column};`,
      ],
    ],
    [
      columnTypeMismatch$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
    [
      primaryKeyMismatch$(),
      (): ReadonlyArray<SoftStr> => [],
    ],
  );

/** Build the forward migration that repairs recoverable mismatches. */
const lagMigration = (
  version: Version,
  domain: Domain,
  mismatches: ReadonlyArray<Mismatch>,
): Migration =>
  migration({
    version,
    name: `${domain.name} schema (forward)`,
    up: mismatches
      .flatMap((m) => additiveUp(domain, m))
      .join("\n"),
    down: some(
      [...mismatches]
        .reverse()
        .flatMap(additiveDown)
        .join("\n"),
    ),
    upTransaction: true,
    downTransaction: true,
  });

/**
 * Classify the mismatches into a {@link SchemaCheck}: none → `Ok`; any
 * irreconcilable → `Drift` (refuse to boot); otherwise → `Lag` with a forward
 * migration.
 */
const classify = (
  version: Version,
  domain: Domain,
  mismatches: ReadonlyArray<Mismatch>,
): SchemaCheck =>
  mismatches.length === 0
    ? schemaOk(domain.name)
    : mismatches.some((m) => !isRecoverable(m))
      ? schemaDrift(mismatches)
      : schemaLag(
          lagMigration(version, domain, mismatches),
          mismatches,
        );

/**
 * The schema-compatibility boot gate. Introspect the live database and verify
 * every entity/field/constraint of `domain` is satisfied: `Ok` when it is, a
 * `Lag` carrying a runnable forward migration when it is merely behind, and a
 * typed `Drift` when it conflicts — so a freshly generated shell started against
 * an incompatible store refuses to boot (as data, matched exhaustively) rather
 * than corrupting the durable core. `version` labels any forward migration.
 */
export const assertPersistedSchema =
  (db: Db, version: Version) =>
  (
    domain: Domain,
  ): PromisedResult<SchemaCheck, CheckError> =>
    proc(
      tableNames(db),
      (tables) =>
        checkAllEntities(db, domain, tables),
      (mismatches) =>
        ok(classify(version, domain, mismatches)),
    );
