import {
  type Num,
  type SoftStr,
} from "plgg";

/**
 * The MIME allowlist for uploaded assets — safe raster images
 * and PDFs only. SVG is deliberately EXCLUDED (it can carry
 * script); an upload of anything else is rejected before it is
 * stored. A closed allowlist, never a denylist.
 */
export const ALLOWED_MIME: ReadonlyArray<SoftStr> =
  [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

/** Hard upper bound on a single asset (10 MiB). */
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;

/** Whether `mime` is on the {@link ALLOWED_MIME} allowlist. */
export const isAllowedMime = (
  mime: SoftStr,
): boolean =>
  ALLOWED_MIME.some((m) => m === mime);

/** Whether `size` (bytes) is positive and within {@link MAX_ASSET_BYTES}. */
export const withinSizeLimit = (
  size: Num,
): boolean =>
  size > 0 && size <= MAX_ASSET_BYTES;

/**
 * Whether a target asset path is safe to write — non-empty,
 * relative (no leading `/`), and with no `..` segment, so an
 * export can never escape the assets tree (the path-safety half
 * of every binary write; the fs seam adds the atomic write).
 */
export const isSafeAssetPath = (
  p: SoftStr,
): boolean =>
  p.length > 0 &&
  !p.startsWith("/") &&
  !p.split("/").includes("..");
