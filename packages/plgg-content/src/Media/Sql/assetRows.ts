import {
  type Result,
  type InvalidError,
  pipe,
  cast,
  mapResult,
  asRawObj,
  asNum,
  asSoftStr,
  forProp,
} from "plgg";
import {
  type Asset,
  asset,
} from "plgg-content/Media/model/Asset";
import { asAssetStatus } from "plgg-content/Media/model/AssetStatus";

/** Decode an `assets` row (metadata only — NOT the bytes) into an {@link Asset}. */
export const asAssetRow = (
  row: unknown,
): Result<Asset, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("id", asNum),
      forProp("hash", asSoftStr),
      forProp("content_path", asSoftStr),
      forProp("mime", asSoftStr),
      forProp("size", asNum),
      forProp("status", asAssetStatus),
      forProp("created_by", asSoftStr),
      forProp("created_at", asNum),
      forProp("updated_at", asNum),
    ),
    mapResult((r) =>
      asset({
        id: r.id,
        hash: r.hash,
        contentPath: r.content_path,
        mime: r.mime,
        size: r.size,
        status: r.status,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
    ),
  );

/** Decode a `bytes_b64` projection into the base64 payload. */
export const asBytesRow = (
  row: unknown,
): Result<{ bytes_b64: string }, InvalidError> =>
  cast(
    row,
    asRawObj,
    forProp("bytes_b64", asSoftStr),
  );

/** Decode an `id` projection (from an INSERT … RETURNING id). */
export const asIdRow = (
  row: unknown,
): Result<{ id: number }, InvalidError> =>
  cast(row, asRawObj, forProp("id", asNum));
