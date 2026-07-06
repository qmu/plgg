import {
  type Num,
  type Option,
  type SoftStr,
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
} from "plgg-content/Media/model/Asset";
import {
  type AssetStatus,
  transitionAssetStatus,
} from "plgg-content/Media/model/AssetStatus";
import { isSafeAssetPath } from "plgg-content/Media/model/MediaSafety";
import { sqlAssetStore } from "plgg-content/Media/Sql/assetStore";

export type PublishAssetError =
  | SqlError
  | InvalidError
  | Defect;

const EXPORTED: AssetStatus = "exported";

/**
 * The fs seam publish writes THROUGH — injected so the export
 * logic is decoupled from `node:fs` and unit-testable; the real
 * implementation (decode base64 → path-safe atomic temp+rename
 * under the assets tree) wires at the serve mount.
 */
export type AssetExportFs = Readonly<{
  writeBytes: (
    relPath: SoftStr,
    bytesB64: SoftStr,
  ) => PromisedResult<null, Defect>;
}>;

/**
 * Admin export of a STAGED asset into the git assets tree
 * (ticket 23). Content-addressed + immutable, so there is no
 * base-revision conflict (unlike a draft) — the branches are:
 * resolve the asset (missing → Err); PATH-SAFETY (unsafe target
 * → Err, no write); load its bytes; transition
 * `staged → exported` (an already-exported/illegal state → Err);
 * write the bytes ATOMICALLY through the injected
 * {@link AssetExportFs}; record the export. Never throws.
 */
export const publishAsset =
  (
    db: Db,
    fs: AssetExportFs,
    clock: () => Num,
  ) =>
  (
    assetId: Num,
  ): PromisedResult<
    AssetStatus,
    PublishAssetError
  > => {
    const store = sqlAssetStore(db);
    return proc(
      store.findAsset(assetId),
      (found: Option<Asset>) =>
        matchOption<
          Asset,
          PromisedResult<
            AssetStatus,
            PublishAssetError
          >
        >(
          () =>
            Promise.resolve(
              err(
                invalidError({
                  message: `asset ${assetId} not found`,
                }),
              ),
            ),
          (a: Asset) =>
            isSafeAssetPath(a.contentPath)
              ? proc(
                  store.loadBytes(assetId),
                  (bytes: Option<SoftStr>) =>
                    matchOption<
                      SoftStr,
                      PromisedResult<
                        AssetStatus,
                        PublishAssetError
                      >
                    >(
                      () =>
                        Promise.resolve(
                          err(
                            invalidError({
                              message: `asset ${assetId} has no bytes`,
                            }),
                          ),
                        ),
                      (b64: SoftStr) =>
                        proc(
                          transitionAssetStatus(
                            a.status,
                            "exported",
                          ),
                          () =>
                            proc(
                              fs.writeBytes(
                                a.contentPath,
                                b64,
                              ),
                              () =>
                                proc(
                                  store.updateStatus(
                                    assetId,
                                    "exported",
                                    clock(),
                                  ),
                                  () =>
                                    ok(EXPORTED),
                                ),
                            ),
                        ),
                    )(bytes),
                )
              : Promise.resolve(
                  err(
                    invalidError({
                      message: `unsafe asset path: ${a.contentPath}`,
                    }),
                  ),
                ),
        )(found),
    );
  };
