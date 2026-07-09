import {
  readFile,
  writeFile,
  rename,
  mkdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import {
  type SoftStr,
  some,
  none,
  ok,
  err,
  defect,
} from "plgg";
import { type ExportFs } from "plgg-cms/content";

/**
 * The real {@link ExportFs} `publishDraft` writes THROUGH, over
 * `node:fs` under `contentDir`. `currentHash` reads the target
 * file and returns its content hash (`None` if absent) for the
 * optimistic base re-check — the base captured at draft-open
 * must be taken with the SAME algorithm. `writeSource` writes
 * ATOMICALLY (temp file + rename, mirroring plgg-bundle's
 * atomic dist publish) so a reader never sees a half-written
 * article. `publishDraft` has already rejected an unsafe path
 * before this runs. Node-only; kept in the editing seam, off
 * the runtime-neutral surfaces.
 */
export const fsExportFs = (
  contentDir: SoftStr,
): ExportFs => ({
  currentHash: async (relPath: SoftStr) => {
    try {
      const content = await readFile(
        join(contentDir, relPath),
        "utf8",
      );
      return some(
        createHash("sha256")
          .update(content)
          .digest("hex"),
      );
    } catch {
      return none();
    }
  },
  writeSource: async (
    relPath: SoftStr,
    content: SoftStr,
  ) => {
    try {
      const abs = join(contentDir, relPath);
      await mkdir(dirname(abs), {
        recursive: true,
      });
      const tmp = `${abs}.tmp`;
      await writeFile(tmp, content, "utf8");
      await rename(tmp, abs);
      return ok(null);
    } catch (cause) {
      return err(
        defect(
          "could not write the exported file",
          cause,
        ),
      );
    }
  },
});
