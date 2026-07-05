import {
  type Option,
  type Num,
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
} from "plgg";
import { type SqlError } from "plgg-sql";
import { type Asset } from "plgg-content/Media/model/Asset";
import { type AssetStatus } from "plgg-content/Media/model/AssetStatus";

/** The admin/uploader filters over the asset list. */
export type AssetFilter = Readonly<{
  createdBy: Option<SoftStr>;
  status: Option<AssetStatus>;
}>;

/**
 * The DB-PRIMARY asset persistence seam (D4). Metadata reads
 * decode through casters; the base64 bytes are loaded
 * SEPARATELY ({@link loadBytes}) so a list never drags every
 * payload into memory. `findByHash` powers content-addressed
 * dedup. `save*` return the id; `updateStatus` takes an
 * ALREADY-validated target. Every method a `Result`, never a
 * throw. The upload/validation and lifecycle live in the
 * usecases above it.
 */
export type AssetStore = Readonly<{
  saveAsset: (
    a: Asset,
    bytesB64: SoftStr,
  ) => PromisedResult<
    Num,
    SqlError | InvalidError | Defect
  >;
  findByHash: (
    hash: SoftStr,
  ) => PromisedResult<
    Option<Asset>,
    SqlError | InvalidError | Defect
  >;
  findAsset: (
    id: Num,
  ) => PromisedResult<
    Option<Asset>,
    SqlError | InvalidError | Defect
  >;
  loadBytes: (
    id: Num,
  ) => PromisedResult<
    Option<SoftStr>,
    SqlError | InvalidError | Defect
  >;
  listAssets: (
    filter: AssetFilter,
  ) => PromisedResult<
    ReadonlyArray<Asset>,
    SqlError | InvalidError | Defect
  >;
  updateStatus: (
    id: Num,
    status: AssetStatus,
    updatedAt: Num,
  ) => PromisedResult<null, SqlError | Defect>;
}>;
