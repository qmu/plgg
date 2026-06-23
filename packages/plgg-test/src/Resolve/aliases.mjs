// Derives the self-package alias→srcRoot map from a package's
// tsconfig `paths`, formatted for PLGG_TEST_ALIASES (one
// `alias=/abs/src/root` per line). This runs in the bin launcher
// BEFORE the resolver hook is registered, because the hook reads the
// env var at module-init time.
//
// tsconfig paths look like `{ "plgg*": ["./src/*"] }` (the plgg
// convention). We translate the `*`-suffixed alias key into a bare
// prefix (`plgg`) and the `./src/*` target into an absolute src root.
import { readFileSync } from "node:fs";
import {
  dirname,
  resolve,
  join,
} from "node:path";

const stripStar = (s) =>
  s.endsWith("*")
    ? s.slice(0, -1).replace(/\/$/, "")
    : s;

// Minimal JSONC-tolerant parse: strip // and /* */ comments, then
// JSON.parse. tsconfig files in this repo are comment-bearing.
const parseJsonc = (text) =>
  JSON.parse(
    text
      .replace(
        /\/\*[\s\S]*?\*\//g,
        "",
      )
      .replace(/(^|\s)\/\/.*$/gm, "$1"),
  );

export const deriveAliases = (
  tsconfigPath,
) => {
  const dir = dirname(
    resolve(tsconfigPath),
  );
  const cfg = parseJsonc(
    readFileSync(
      tsconfigPath,
      "utf8",
    ),
  );
  const paths =
    cfg?.compilerOptions?.paths ?? {};
  return Object.entries(paths)
    .flatMap(([key, targets]) => {
      const prefix = stripStar(key);
      const target = Array.isArray(
        targets,
      )
        ? targets[0]
        : undefined;
      if (
        !prefix ||
        typeof target !== "string"
      ) {
        return [];
      }
      const srcRoot = resolve(
        dir,
        stripStar(target) || ".",
      );
      return [
        `${prefix}=${srcRoot}`,
      ];
    })
    .join("\n");
};

// Also resolve the absolute path of plgg-test's own src so the
// launcher can always self-resolve `plgg-test/*` even when running a
// foreign package whose tsconfig only aliases its own name.
export const selfSrcRoot = (
  launcherDir,
) => join(launcherDir, "..", "src");
