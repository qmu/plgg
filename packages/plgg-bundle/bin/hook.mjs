// ESM resolver hook, two jobs:
//
// 1. Self-alias: rewrite `plgg-bundle/<sub>` to the
//    on-disk `src/<sub>` file (`.ts` or `/index.ts`) so
//    the bundler's own source uses extensionless
//    self-alias specifiers like the rest of the monorepo.
//
// 2. Dev hot-reload version propagation: when the importer
//    (`context.parentURL`) carries a `?v=<n>` query, append
//    the SAME query to a resolved LOCAL file. `plgg-bundle
//    dev` re-imports the app's dev entry as `entry?v=<n>`
//    after a source edit; this propagation carries the
//    version down the whole local import subgraph so Node
//    re-evaluates every affected module (not just the
//    entry) — real code hot-reload, no process restart.
//    `node:*` and `node_modules` are never versioned (they
//    don't change during a dev session), so they stay
//    cached.
//
// Everything else (typescript, node:*) falls through to
// Node's default resolution.
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, "..", "src");
const prefix = "plgg-bundle/";

// Resolve to a FILE, never a directory: a bare-directory
// self-alias (e.g. `plgg-bundle/foo`) must land on its
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

// The `?v=<n>` dev version carried by an importer URL, or
// null when absent.
const versionOf = (url) => {
  if (!url) {
    return null;
  }
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
};

// Append a dev version query to a resolved URL, respecting
// an existing query string.
const withVersion = (url, version) =>
  `${url}${url.includes("?") ? "&" : "?"}v=${version}`;

// Whether a resolved URL is a workspace-local source file
// (a `file:` URL outside node_modules) — the only modules
// that participate in hot-reload.
const isLocalSource = (url) =>
  url.startsWith("file:") &&
  !url.includes("/node_modules/");

export const resolve = async (
  specifier,
  context,
  nextResolve,
) => {
  const version = versionOf(context.parentURL);
  if (specifier.startsWith(prefix)) {
    // Drop any propagated `?v=` before the on-disk lookup,
    // then re-attach it so a versioned parent still busts
    // a self-aliased child's module cache.
    const [sub] = specifier
      .slice(prefix.length)
      .split("?");
    const file = pick(join(srcRoot, sub));
    if (file) {
      const url = pathToFileURL(file).href;
      return {
        url:
          version === null
            ? url
            : withVersion(url, version),
        shortCircuit: true,
      };
    }
  }
  const resolved = await nextResolve(
    specifier,
    context,
  );
  return version !== null &&
    isLocalSource(resolved.url)
    ? { ...resolved, url: withVersion(resolved.url, version) }
    : resolved;
};
