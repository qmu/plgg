import {
  writeFile,
  rename,
  mkdir,
} from "node:fs/promises";
import { join, dirname } from "node:path";
import {
  type SoftStr,
  ok,
  err,
  defect,
} from "plgg";
import { type AssetExportFs } from "plgg-cms/content";

/**
 * The real {@link AssetExportFs} `publishAsset` writes THROUGH,
 * over `node:fs` under `assetsDir`. `writeBytes` decodes the
 * base64 payload and writes it ATOMICALLY (temp file + rename,
 * mirroring plgg-bundle's atomic dist publish) so a reader
 * never sees a half-written binary. `publishAsset` has already
 * rejected an unsafe path before this runs. Node-only; kept in
 * the media seam, off the runtime-neutral surfaces.
 */
export const fsAssetExportFs = (
  assetsDir: SoftStr,
): AssetExportFs => ({
  writeBytes: async (
    relPath: SoftStr,
    bytesB64: SoftStr,
  ) => {
    try {
      const abs = join(assetsDir, relPath);
      await mkdir(dirname(abs), {
        recursive: true,
      });
      const tmp = `${abs}.tmp`;
      await writeFile(
        tmp,
        Buffer.from(bytesB64, "base64"),
      );
      await rename(tmp, abs);
      return ok(null);
    } catch (cause) {
      return err(
        defect(
          "could not write the exported asset",
          cause,
        ),
      );
    }
  },
});
