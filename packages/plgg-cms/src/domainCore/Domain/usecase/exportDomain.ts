import {
  type Result,
  type Option,
  type SoftStr,
  type InvalidError,
  type Defect,
  type PromisedResult,
  ok,
  none,
  pipe,
  proc,
  mapResult,
  chainResult,
  matchOption,
  isOption,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  identSql,
  query,
  sqlIdentString,
} from "plgg-sql";
import { type Version } from "plgg-db-migration";
import {
  type Field,
  type JsonScalar,
} from "plgg-cms/domainCore/Domain/model/Field";
import {
  type Entity,
  type DecodedRow,
} from "plgg-cms/domainCore/Domain/model/Entity";
import { type Domain } from "plgg-cms/domainCore/Domain/model/Domain";
import { domainManifest } from "plgg-cms/domainCore/Domain/model/DomainManifest";
import {
  type DomainExport,
  type EntityExport,
  type JsonRow,
  manifestJson,
} from "plgg-cms/domainCore/Domain/model/DomainExport";
import { decodeEntity } from "plgg-cms/domainCore/Domain/usecase/decodeEntity";

/** The error channel of an export. */
type ExportError =
  | SqlError
  | InvalidError
  | Defect;

/** One `[column, value]` JSON entry. */
type Entry = readonly [SoftStr, JsonScalar];

/** Build a JSON entry as a genuine tuple (no cast). */
const entry = (
  key: SoftStr,
  value: JsonScalar,
): Entry => [key, value];

/**
 * The JSON entries (0 or 1) one field contributes to a row. Operates on a row
 * fresh from {@link decodeEntity}, so every field key is present and a nullable
 * value is always an `Option` — a `None` contributes no entry (the column is
 * omitted from the JSON), a `Some`/required value is lowered through the field's
 * `toJson`.
 */
const entriesFor = (
  row: DecodedRow,
  field: Field,
): Result<
  ReadonlyArray<Entry>,
  InvalidError
> => {
  const key = sqlIdentString(field.name);
  const raw = row[key];
  return field.nullable
    ? matchOption(
        (): Result<
          ReadonlyArray<Entry>,
          InvalidError
        > => ok([]),
        (
          v: unknown,
        ): Result<
          ReadonlyArray<Entry>,
          InvalidError
        > =>
          pipe(
            field.toJson(v),
            mapResult((j: JsonScalar) => [
              entry(key, j),
            ]),
          ),
      )(isOption(raw) ? raw : none())
    : pipe(
        field.toJson(raw),
        mapResult((j: JsonScalar) => [
          entry(key, j),
        ]),
      );
};

/** Sequence an array of Results into a Result of the array. */
const sequence = <T>(
  rs: ReadonlyArray<Result<T, InvalidError>>,
): Result<ReadonlyArray<T>, InvalidError> =>
  rs.reduce<
    Result<ReadonlyArray<T>, InvalidError>
  >(
    (accR, r) =>
      chainResult((acc: ReadonlyArray<T>) =>
        pipe(
          r,
          mapResult((t: T) => [...acc, t]),
        ),
      )(accR),
    ok([]),
  );

/** Lower one decoded row to a JSON row (absent nullable columns omitted). */
const toJsonRow = (
  entity: Entity,
  row: DecodedRow,
): Result<JsonRow, InvalidError> =>
  pipe(
    sequence(
      entity.fields.map((f) =>
        entriesFor(row, f),
      ),
    ),
    mapResult(
      (
        chunks: ReadonlyArray<
          ReadonlyArray<Entry>
        >,
      ): JsonRow =>
        Object.fromEntries(chunks.flat()),
    ),
  );

/** Export one entity: read, decode, and lower every row to JSON. */
const exportEntity = (
  db: Db,
  entity: Entity,
): PromisedResult<EntityExport, ExportError> =>
  proc(
    query(db)(
      sql`SELECT * FROM ${identSql(entity.name)}`,
    ),
    (rows) =>
      sequence(rows.map(decodeEntity(entity))),
    (decoded: ReadonlyArray<DecodedRow>) =>
      sequence(
        decoded.map((r) => toJsonRow(entity, r)),
      ),
    (rows: ReadonlyArray<JsonRow>) =>
      ok({
        entity: sqlIdentString(entity.name),
        rows,
      }),
  );

/** Sequence entity-export Results (widened error channel). */
const sequenceExports = (
  results: ReadonlyArray<
    Result<EntityExport, ExportError>
  >,
): Result<
  ReadonlyArray<EntityExport>,
  ExportError
> =>
  results.reduce<
    Result<
      ReadonlyArray<EntityExport>,
      ExportError
    >
  >(
    (accR, r) =>
      chainResult(
        (acc: ReadonlyArray<EntityExport>) =>
          pipe(
            r,
            mapResult((e: EntityExport) => [
              ...acc,
              e,
            ]),
          ),
      )(accR),
    ok([]),
  );

/**
 * Export the whole domain to a code-independent {@link DomainExport}: every
 * entity's rows decoded through the casters and lowered to JSON, plus the
 * provenance manifest (at `schemaHead`). This is the portability guarantee that
 * lets the sacrificial app be discarded — the dump depends on no application
 * code, only the durable {@link Domain}.
 */
export const exportDomain =
  (db: Db, schemaHead: Option<Version>) =>
  (
    domain: Domain,
  ): PromisedResult<DomainExport, ExportError> =>
    proc(
      Promise.all(
        domain.entities.map((e) =>
          exportEntity(db, e),
        ),
      ),
      (
        results: ReadonlyArray<
          Result<EntityExport, ExportError>
        >,
      ) => sequenceExports(results),
      (entities: ReadonlyArray<EntityExport>) =>
        ok({
          manifest: manifestJson(
            domainManifest(domain, schemaHead),
          ),
          entities,
        }),
    );
