// ESM resolver hook: rewrite the package self-alias
// `plggpress/<sub>` to the on-disk `src/<sub>` file
// (`.ts` or `/index.ts`), so the CLI's own source can use
// the same extensionless self-alias specifiers the rest
// of the monorepo does. Everything else (the plgg family,
// node:*) falls through to Node's default resolution. A
// near-verbatim copy of plgg-bundle/bin/hook.mjs with the
// prefix retargeted — no new dependency.
import { existsSync } from "node:fs";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import { dirname, join } from "node:path";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const srcRoot = join(here, "..", "src");
const prefix = "plggpress/";

const pick = (base) => {
  const candidates = [
    base,
    `${base}.ts`,
    join(base, "index.ts"),
  ];
  return candidates.find((c) =>
    existsSync(c),
  );
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
