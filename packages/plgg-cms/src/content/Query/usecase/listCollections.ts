import {
  type Result,
  type InvalidError,
  type Defect,
  type PromisedResult,
  type SoftStr,
  proc,
  pipe,
  cast,
  asObj,
  asSoftStr,
  forProp,
  chainResult,
  decodeJson,
} from "plgg";
import {
  type Db,
  type SqlError,
  sql,
  query,
  decodeRows,
} from "plgg-sql";
import {
  type CollectionSchema,
  asCollectionSchema,
} from "plgg-cms/content/Query/model/CollectionSchema";

/** Decodes one `collections` row (a serialized schema). */
const asCollectionRow = (
  row: unknown,
): Result<CollectionSchema, InvalidError> =>
  pipe(
    cast(
      row,
      asObj,
      forProp("schema_json", asSoftStr),
    ),
    chainResult(
      (r: { schema_json: SoftStr }) =>
        chainResult(asCollectionSchema)(
          decodeJson(r.schema_json),
        ),
    ),
  );

/**
 * Lists every registered collection's
 * {@link CollectionSchema} (the MicroCMS "list APIs"
 * response) — HTTP-free, the same function backing the
 * delivery API, the admin UI, the MCP tools, and the plugin
 * export.
 */
export const listCollections = (
  db: Db,
): PromisedResult<
  ReadonlyArray<CollectionSchema>,
  SqlError | InvalidError | Defect
> =>
  proc(
    query(db)(
      sql`SELECT schema_json FROM collections ORDER BY name`,
    ),
    decodeRows(asCollectionRow),
  );
