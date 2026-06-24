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

// JSONC-tolerant parse. A naive regex stripper is wrong here: path
// alias targets like "./src/*" contain the substring `/*`, which a
// block-comment regex would mistake for a comment start. So we scan
// char-by-char, tracking whether we're inside a string, and only treat
// `//` and `/* */` as comments OUTSIDE strings. Trailing commas are
// then dropped before JSON.parse.
const stripComments = (text) => {
  let out = "";
  let i = 0;
  let inStr = false;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (inStr) {
      out += c;
      if (c === "\\") {
        out += n ?? "";
        i += 2;
        continue;
      }
      if (c === '"') {
        inStr = false;
      }
      i += 1;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && n === "/") {
      while (
        i < text.length &&
        text[i] !== "\n"
      ) {
        i += 1;
      }
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (
        i < text.length &&
        !(
          text[i] === "*" &&
          text[i + 1] === "/"
        )
      ) {
        i += 1;
      }
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
};

const parseJsonc = (text) =>
  JSON.parse(
    stripComments(text).replace(
      /,(\s*[}\]])/g,
      "$1",
    ),
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
