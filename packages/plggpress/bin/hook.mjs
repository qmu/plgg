// ESM resolver hook: rewrite the package self-alias
// `plggpress/<sub>` to the on-disk `src/<sub>` file
// (`.ts` or `/index.ts`), so the CLI's own source can use
// the same extensionless self-alias specifiers the rest
// of the monorepo does. Everything else (the plgg family,
// node:*) falls through to Node's default resolution. A
// near-verbatim copy of plgg-bundle/bin/hook.mjs with the
// prefix retargeted — no new dependency.
import { existsSync, statSync } from "node:fs";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import {
  dirname,
  join,
  extname,
} from "node:path";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const srcRoot = join(here, "..", "src");
const prefix = "plggpress/";

// Resolve to a FILE, never a directory: a bare-directory
// self-alias (e.g. `plggpress/framework`) must land on its
// `index.ts`, not the directory itself — Node would `read`
// the directory and throw EISDIR. So the raw `base` matches
// only when it is a real file; a directory falls through to
// `base/index.ts`.
const isFile = (c) =>
  existsSync(c) && statSync(c).isFile();

const pick = (base) => {
  const candidates = [
    base,
    `${base}.ts`,
    join(base, "index.ts"),
  ];
  return candidates.find(isFile);
};

// A relative specifier (`./x`, `../y`). Node's ESM resolver
// won't guess an extension for one, so an EXTENSIONLESS
// relative TS import — the idiomatic form vite/VitePress
// resolve, e.g. a `site.config.ts` sourcing its IA from
// `../ia/nav` — otherwise fails with "Cannot find module".
const isRelative = (s) =>
  s.startsWith("./") || s.startsWith("../");

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
  // Resolve an extensionless relative import against the
  // importer's directory, trying `.ts` / `/index.ts` — the
  // same `pick` the self-alias uses. A specifier that
  // already carries an extension, or a bare/package one,
  // falls through to Node's default resolution untouched.
  if (
    isRelative(specifier) &&
    extname(specifier) === "" &&
    context.parentURL
  ) {
    const base = fileURLToPath(
      new URL(specifier, context.parentURL),
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
