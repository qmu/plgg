import {
  type Result,
  type Option,
  type SoftStr,
  type InvalidError,
  ok,
  err,
  some,
  none,
  proc,
  matchResult,
} from "plgg";
import {
  type Db,
  sql,
  query,
  exec,
  decodeRow,
  decodeRows,
} from "plgg-sql";
import { type AssetStore } from "plgg-cms/content/Media/model/AssetStore";
import { type Asset } from "plgg-cms/content/Media/model/Asset";
import {
  asAssetRow,
  asBytesRow,
  asIdRow,
} from "plgg-cms/content/Media/Sql/assetRows";

const firstAsset = (
  rows: ReadonlyArray<unknown>,
): Result<Option<Asset>, InvalidError> => {
  const head = rows[0];
  return head === undefined
    ? ok(none())
    : matchResult<
        Asset,
        InvalidError,
        Result<Option<Asset>, InvalidError>
      >(
        (e) => err(e),
        (a: Asset) => ok(some(a)),
      )(asAssetRow(head));
};

const firstBytes = (
  rows: ReadonlyArray<unknown>,
): Result<Option<SoftStr>, InvalidError> => {
  const head = rows[0];
  return head === undefined
    ? ok(none())
    : matchResult<
        { bytes_b64: string },
        InvalidError,
        Result<Option<SoftStr>, InvalidError>
      >(
        (e) => err(e),
        (r: { bytes_b64: string }) =>
          ok(some(r.bytes_b64)),
      )(asBytesRow(head));
};

/**
 * The {@link AssetStore} over a `Db` (the durable file from
 * {@link openAssetStore}). Metadata bound + decoded through
 * casters; the base64 payload lives in `bytes_b64` and is read
 * only on demand. `save*` return the id via `RETURNING id`.
 */
export const sqlAssetStore = (
  db: Db,
): AssetStore => ({
  saveAsset: (a, bytesB64) =>
    proc(
      query(db)(
        sql`INSERT INTO assets (hash, content_path, mime, size, status, created_by, created_at, updated_at, bytes_b64) VALUES (${a.hash}, ${a.contentPath}, ${a.mime}, ${a.size}, ${a.status}, ${a.createdBy}, ${a.createdAt}, ${a.updatedAt}, ${bytesB64}) RETURNING id`,
      ),
      decodeRow(asIdRow),
      (r: { id: number }) => ok(r.id),
    ),
  findByHash: (hash) =>
    proc(
      query(db)(
        sql`SELECT * FROM assets WHERE hash = ${hash}`,
      ),
      firstAsset,
    ),
  findAsset: (id) =>
    proc(
      query(db)(
        sql`SELECT * FROM assets WHERE id = ${id}`,
      ),
      firstAsset,
    ),
  loadBytes: (id) =>
    proc(
      query(db)(
        sql`SELECT bytes_b64 FROM assets WHERE id = ${id}`,
      ),
      firstBytes,
    ),
  listAssets: (filter) =>
    proc(
      query(db)(
        sql`SELECT id, hash, content_path, mime, size, status, created_by, created_at, updated_at FROM assets WHERE (${filter.createdBy} IS NULL OR created_by = ${filter.createdBy}) AND (${filter.status} IS NULL OR status = ${filter.status}) ORDER BY created_at DESC`,
      ),
      decodeRows(asAssetRow),
    ),
  updateStatus: (id, status, updatedAt) =>
    proc(
      exec(db)(
        sql`UPDATE assets SET status = ${status}, updated_at = ${updatedAt} WHERE id = ${id}`,
      ),
      () => ok(null),
    ),
});
