import {
  type Result,
  type InvalidError,
  type Defect,
  type PromisedResult,
  proc,
  ok,
  encodeJson,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  exec,
} from "plgg-sql";
import { type CollectionSchema } from "plgg-content/Query/model/CollectionSchema";

/**
 * Registers (or replaces) a collection's serialized
 * {@link CollectionSchema} in the `collections` table — the
 * MicroCMS "API schema" the schema endpoint and D17 plugin
 * export read. Upsert by `name`, so re-registering an
 * unchanged schema is a no-op.
 */
export const registerCollection =
  (db: Db) =>
  (
    schema: CollectionSchema,
  ): PromisedResult<
    null,
    SqlError | InvalidError | Defect
  > =>
    proc(
      schema,
      (): Result<string, InvalidError> =>
        encodeJson(schema),
      (json: string) =>
        exec(db)(
          sql`INSERT INTO collections (name, schema_json) VALUES (${schema.name}, ${json}) ON CONFLICT(name) DO UPDATE SET schema_json = excluded.schema_json`,
        ),
      () => ok(null),
    );
