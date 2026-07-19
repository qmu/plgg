import {
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { transpileToEsm } from "plgg-bundle/vendors/transpiler";

/**
 * Import a `bundle.config.ts` WITHOUT Node inferring the
 * module system from the package's `package.json`.
 *
 * Loading the `.ts` directly makes Node look up the
 * nearest `package.json` to decide ESM vs CJS; the 20
 * non-private packages that omit `"type"` each trip
 * `MODULE_TYPELESS_PACKAGE_JSON` on every build. Instead
 * we transpile the config to ESM with the vendored
 * TypeScript and write it beside the original as a `.mjs`
 * — an extension Node treats as unambiguously ESM and for
 * which it never consults `package.json` — then import
 * and delete it. Writing the sibling in the config's own
 * directory keeps `import.meta.dirname` pointing at the
 * package root, which the configs use as `root`.
 *
 * The fix is structural (change how the file is loaded),
 * not `NODE_NO_WARNINGS` and not stderr filtering.
 *
 * Effectful (transpile + temp file + dynamic import), so
 * it lives at the vendor boundary rather than in the
 * domain.
 */
export const importConfigModule = async (
  configPath: string,
): Promise<unknown> => {
  const source = readFileSync(configPath, "utf8");
  const js = transpileToEsm(configPath, source);
  const mjsPath = join(
    dirname(configPath),
    `.bundle.config.${process.pid}.mjs`,
  );
  writeFileSync(mjsPath, js, "utf8");
  try {
    return await import(
      pathToFileURL(mjsPath).href
    );
  } finally {
    rmSync(mjsPath, { force: true });
  }
};
