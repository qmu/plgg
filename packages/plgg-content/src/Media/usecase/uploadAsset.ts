import {
  type Num,
  type Option,
  type SoftStr,
  type Result,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  err,
  proc,
  matchOption,
  invalidError,
} from "plgg";
import {
  type Db,
  type SqlError,
} from "plgg-sql";
import {
  type Asset,
  asset,
} from "plgg-content/Media/model/Asset";
import {
  isAllowedMime,
  withinSizeLimit,
  isSafeAssetPath,
} from "plgg-content/Media/model/MediaSafety";
import { sqlAssetStore } from "plgg-content/Media/Sql/assetStore";

export type UploadError =
  | SqlError
  | InvalidError
  | Defect;

/**
 * An upload request. `hash` (content address) and `size` are
 * computed by the CALLER from the bytes (the upload Web owns
 * `node:crypto`), so this usecase stays crypto-free and
 * unit-testable; `bytesB64` is the base64 payload the store
 * persists.
 */
export type UploadInput = Readonly<{
  contentPath: SoftStr;
  mime: SoftStr;
  size: Num;
  hash: SoftStr;
  bytesB64: SoftStr;
  createdBy: SoftStr;
}>;

/** Type-, size-, and path-check an upload before anything is stored. */
const validate = (
  input: UploadInput,
): Result<null, InvalidError> =>
  !isAllowedMime(input.mime)
    ? err(
        invalidError({
          message: `disallowed media type: ${input.mime}`,
        }),
      )
    : !withinSizeLimit(input.size)
      ? err(
          invalidError({
            message: `asset size out of range: ${input.size}`,
          }),
        )
      : !isSafeAssetPath(input.contentPath)
        ? err(
            invalidError({
              message: `unsafe asset path: ${input.contentPath}`,
            }),
          )
        : ok(null);

/**
 * Upload an asset (ticket 23): validate the MIME type, size,
 * and target path (any failure → typed `Err`, nothing stored),
 * then dedup by content hash — an identical prior upload is
 * returned as-is (no second row), otherwise a new `staged`
 * asset is stored with its bytes. Never throws.
 */
export const uploadAsset =
  (db: Db, clock: () => Num) =>
  (
    input: UploadInput,
  ): PromisedResult<Asset, UploadError> => {
    const store = sqlAssetStore(db);
    const now = clock();
    return proc(validate(input), () =>
      proc(
        store.findByHash(input.hash),
        (existing: Option<Asset>) =>
          matchOption<
            Asset,
            PromisedResult<Asset, UploadError>
          >(
            () => {
              const a = asset({
                id: 0,
                hash: input.hash,
                contentPath: input.contentPath,
                mime: input.mime,
                size: input.size,
                status: "staged",
                createdBy: input.createdBy,
                createdAt: now,
                updatedAt: now,
              });
              return proc(
                store.saveAsset(
                  a,
                  input.bytesB64,
                ),
                (id: Num) =>
                  ok(asset({ ...a, id })),
              );
            },
            (dup: Asset) =>
              Promise.resolve(ok(dup)),
          )(existing),
      ),
    );
  };
