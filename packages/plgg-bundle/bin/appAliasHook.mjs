// Dev-only cross-package source resolver, registered by
// `plgg-bundle dev` with the config's `dev.sourceAliases`.
// It resolves a dependency package's self-alias
// (`<prefix>/<sub>`) to that package's SOURCE `.ts` (not
// its built dist), so a theme/library package's source
// participates in hot-reload. It runs BEFORE the package's
// own `bin/hook.mjs` in the loader chain (registered
// later), so on an alias hit it resolves + version-stamps
// and short-circuits; everything else passes straight
// through to the next hook (which owns `plgg-bundle/*`
// resolution and the general `?v=` propagation) — so the
// version is never appended twice.
import { statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

let aliases = [];

// `register(..., { data })` delivers the sourceAliases here
// (the hook runs on a separate thread; data is cloned in).
export const initialize = (data) => {
  aliases = Array.isArray(data?.aliases)
    ? data.aliases
    : [];
};

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

// Resolve a base to a FILE (never a directory): a bare
// `<prefix>` specifier's base is the src dir itself, which
// exists — so `index.ts` must be preferred, not the dir.
const pick = (base) =>
  [
    base,
    `${base}.ts`,
    join(base, "index.ts"),
  ].find(isFile);

const versionOf = (url) => {
  if (!url) {
    return null;
  }
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
};

const withVersion = (url, v) =>
  `${url}${url.includes("?") ? "&" : "?"}v=${v}`;

export const resolve = (
  specifier,
  context,
  nextResolve,
) => {
  for (const { prefix, srcDir } of aliases) {
    if (
      specifier === prefix ||
      specifier.startsWith(`${prefix}/`)
    ) {
      const sub = specifier
        .slice(prefix.length)
        .replace(/^\//, "")
        .split("?")[0];
      const file = pick(
        sub === "" ? srcDir : join(srcDir, sub),
      );
      if (file) {
        const url = pathToFileURL(file).href;
        const v = versionOf(context.parentURL);
        return {
          url:
            v === null
              ? url
              : withVersion(url, v),
          shortCircuit: true,
        };
      }
    }
  }
  // Not an aliased specifier — defer to the next hook,
  // which owns the general `?v=` propagation.
  return nextResolve(specifier, context);
};
