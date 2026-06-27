// ESM resolver hook: rewrite the package self-alias
// `plgg-db-migration/<sub>` to the on-disk `src/<sub>`
// file (`.ts` or `/index.ts`), so the package's own
// source can use extensionless self-alias specifiers the
// same way the rest of the monorepo does. Everything else
// (plgg, plgg-sql, node:*) falls through to Node's
// default resolution.
import { existsSync } from "node:fs";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, "..", "src");
const prefix = "plgg-db-migration/";

const pick = (base) => {
  const candidates = [
    base,
    `${base}.ts`,
    join(base, "index.ts"),
  ];
  return candidates.find((c) => existsSync(c));
};

export const resolve = (
  specifier,
  context,
  nextResolve,
) => {
  if (specifier.startsWith(prefix)) {
    const base = join(
      srcRoot,
      specifier.slice(prefix.length),
    );
    const file = pick(base);
    if (file) {
      return {
        url: pathToFileURL(file).href,
        shortCircuit: true,
      };
    }
  }
  return nextResolve(specifier, context);
};
