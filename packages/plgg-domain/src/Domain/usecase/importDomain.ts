import {
  Option,
  SoftStr,
  InvalidError,
  Defect,
  PromisedResult,
  ok,
  err,
  some,
  none,
  proc,
  matchOption,
  fromNullable,
  invalidError,
  hasProp,
} from "plgg";
import {
  Db,
  SqlError,
  exec,
  transaction,
  sqlIdentString,
} from "plgg-sql";
import {
  Entity,
  DecodedRow,
} from "plgg-domain/Domain/model/Entity";
import { Domain } from "plgg-domain/Domain/model/Domain";
import {
  DomainExport,
  EntityExport,
  JsonRow,
} from "plgg-domain/Domain/model/DomainExport";
import {
  encodeEntity,
  insertSql,
} from "plgg-domain/Domain/usecase/encodeEntity";

/** The error channel of an import. */
type ImportError =
  | SqlError
  | InvalidError
  | Defect;

/** Build a `[column, value]` pair as a genuine tuple (no cast). */
const pair = (
  key: SoftStr,
  value: unknown,
): readonly [SoftStr, unknown] => [key, value];

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

/**
 * Reconstruct a decoded row from a JSON row: nullable fields become `Option`s
 * (an omitted key → `None`), present required fields keep their raw scalar.
 * Feeds {@link encodeEntity}, which re-validates every value through the field
 * encoders before it reaches SQL.
 */
const jsonRowToDecoded = (
  entity: Entity,
  jsonRow: JsonRow,
): DecodedRow =>
  Object.fromEntries(
    entity.fields.flatMap((f) => {
      const key = sqlIdentString(f.name);
      return f.nullable
        ? [
            pair(
              key,
              hasProp(jsonRow, key)
                ? some(jsonRow[key])
                : none(),
            ),
          ]
        : hasProp(jsonRow, key)
          ? [pair(key, jsonRow[key])]
          : [];
    }),
  );

/** Encode and insert one JSON row. */
const importRow = (
  db: Db,
  entity: Entity,
  row: JsonRow,
): PromisedResult<void, ImportError> =>
  proc(
    encodeEntity(entity)(
      jsonRowToDecoded(entity, row),
    ),
    (bindings) =>
      exec(db)(insertSql(entity, bindings)),
    () => ok(undefined),
  );

/** Import one export section into its domain entity. */
const importSection = (
  db: Db,
  domain: Domain,
  section: EntityExport,
): PromisedResult<void, ImportError> =>
  matchOption(
    (): PromisedResult<void, ImportError> =>
      Promise.resolve(
        err(
          invalidError({
            message: `export names unknown entity "${section.entity}"`,
          }),
        ),
      ),
    (entity: Entity): PromisedResult<
      void,
      ImportError
    > =>
      section.rows.reduce<
        PromisedResult<void, ImportError>
      >(
        (accP, row) =>
          proc(accP, () =>
            importRow(db, entity, row),
          ),
        Promise.resolve(ok(undefined)),
      ),
  )(findEntity(domain, section.entity));

/**
 * Restore a {@link DomainExport} into a fresh database (its schema already
 * derived) — the inverse of {@link exportDomain}. Every row is re-validated
 * through the field encoders on the way in, and the whole restore runs in one
 * transaction so a partial import can never leave the durable store half-filled.
 */
export const importDomain =
  (db: Db, domain: Domain) =>
  (
    exported: DomainExport,
  ): PromisedResult<void, ImportError> =>
    transaction(db, (): PromisedResult<
      void,
      ImportError
    > =>
      exported.entities.reduce<
        PromisedResult<void, ImportError>
      >(
        (accP, section) =>
          proc(accP, () =>
            importSection(db, domain, section),
          ),
        Promise.resolve(ok(undefined)),
      ),
    )(undefined);
