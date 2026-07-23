import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  pathToFileURL,
  fileURLToPath,
} from "node:url";
import ts from "typescript";

/**
 * ESM resolver hook (Plan Amendment 4: a gated acceptance fixture
 * exercises this).
 *
 * Specs import their OWN package via a tsconfig path alias that vite's
 * `resolve.alias` handles at vitest time — e.g. `plgg/index`,
 * `plgg/Functionals/bind`, `plgg-kit/index`, `plgg-test/Core/Runner`.
 * Native Node does not know these aliases, so this hook rewrites a
 * self-package specifier to the absolute `src/...` file URL.
 *
 * CROSS-package bare specifiers (`import { ok } from "plgg"` inside a
 * plgg-kit spec) are deliberately NOT rewritten: they must fall
 * through to normal node_modules / `file:` resolution against built
 * dist, exactly as today. The three shapes the fixture proves:
 *   1. self `<alias>/index`        -> src/index.ts
 *   2. self `<alias>/Deep/Path`    -> src/Deep/Path.ts
 *   3. cross-package bare `"plgg"` -> falls through (node_modules)
 *
 * The alias→srcRoot mapping is supplied via PLGG_TEST_ALIASES as
 * `alias=/abs/src/root` entries joined by the path delimiter, so one
 * hook serves any package without hard-coding names.
 */

type Alias = Readonly<{
  prefix: string;
  srcRoot: string;
}>;

const parseAliases = (): ReadonlyArray<Alias> =>
  (process.env.PLGG_TEST_ALIASES ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const eq = line.indexOf("=");
      return eq <= 0
        ? []
        : [
            {
              prefix: line.slice(0, eq),
              srcRoot: line.slice(eq + 1),
            },
          ];
    });

const ALIASES = parseAliases();

// Resolves a self-alias specifier to a concrete src file URL, trying
// `<path>.ts` then `<path>/index.ts`. Returns the matched URL or the
// empty string when no alias applies (fall through).
const rewrite = (specifier: string): string => {
  const hit = ALIASES.find(
    (a) =>
      specifier === a.prefix ||
      specifier.startsWith(a.prefix + "/"),
  );
  if (hit === undefined) {
    return "";
  }
  const rel =
    specifier === hit.prefix
      ? ""
      : specifier.slice(hit.prefix.length + 1);
  const base =
    rel === ""
      ? hit.srcRoot
      : join(hit.srcRoot, rel);
  const asTs = base + ".ts";
  return existsSync(asTs)
    ? pathToFileURL(asTs).href
    : existsSync(join(base, "index.ts"))
      ? pathToFileURL(join(base, "index.ts")).href
      : "";
};

// The Node loader-hook `resolve` contract.
type ResolveContext = {
  conditions: ReadonlyArray<string>;
  importAttributes: Record<string, string>;
  parentURL?: string;
};

type ResolveResult = {
  url: string;
  shortCircuit?: boolean;
  format?: string;
};

type NextResolve = (
  specifier: string,
  context: ResolveContext,
) => ResolveResult | Promise<ResolveResult>;

// Relative ESM specifiers carry an explicit `.js` extension (NodeNext
// style, required so the emitted dist `.d.ts` re-exports resolve under
// the consumer's `module: NodeNext`). At runtime the on-disk file is the
// `.ts` source, so a `./Foo.js` import from a local `.ts` parent must be
// redirected to `./Foo.ts`. Native `--experimental-strip-types`
// resolution would do this, but our `load` hook owns `.ts` transpilation
// (proper import elision, see below), so we mirror the `.js`->`.ts`
// redirect here for relative specifiers under a local parent.
const rewriteRelativeTs = (
  specifier: string,
  parentURL: string | undefined,
): string => {
  // The Runner imports each spec with a `?t=<cacheBust>` query
  // (Runner.ts), so the `parentURL` a relative import sees is
  // `…spec.ts?t=123` — NOT ending in `.ts`. Strip the query before the
  // guards and before resolving, mirroring the `load` hook, so a
  // spec's own `../index.js` redirects to `../index.ts` even on a
  // cache-busted re-import.
  const parent =
    parentURL === undefined
      ? undefined
      : stripQuery(parentURL);
  if (
    parent === undefined ||
    !parent.startsWith("file:") ||
    !parent.endsWith(".ts") ||
    !(
      specifier.startsWith("./") ||
      specifier.startsWith("../")
    ) ||
    !specifier.endsWith(".js")
  ) {
    return "";
  }
  const target = new URL(specifier, parent);
  const tsHref = target.href.replace(
    /\.js$/,
    ".ts",
  );
  return existsSync(fileURLToPath(tsHref))
    ? tsHref
    : "";
};

export const resolve = async (
  specifier: string,
  context: ResolveContext,
  next: NextResolve,
): Promise<ResolveResult> => {
  const rewritten = rewrite(specifier);
  if (rewritten !== "") {
    return {
      url: rewritten,
      shortCircuit: true,
      format: "module",
    };
  }
  const relTs = rewriteRelativeTs(
    specifier,
    context.parentURL,
  );
  return relTs === ""
    ? next(specifier, context)
    : {
        url: relTs,
        shortCircuit: true,
        format: "module",
      };
};

// The Node loader-hook `load` contract.
type LoadContext = {
  format?: string;
  conditions: ReadonlyArray<string>;
  importAttributes: Record<string, string>;
};

type LoadResult = {
  format: string;
  source: string;
  shortCircuit?: boolean;
};

type NextLoad = (
  url: string,
  context: LoadContext,
) => LoadResult | Promise<LoadResult>;

/**
 * `load` hook: transpiles `.ts` modules with the TypeScript compiler
 * (already a devDep of every package — NOT a new third-party runtime
 * dep). We use `ts.transpileModule` instead of Node's native
 * `--experimental-strip-types` because native stripping only removes
 * syntactic types and `import type`, leaving MIXED type+value imports
 * intact (`import { ok, Apply1 }`); plgg's source is not
 * `verbatimModuleSyntax`-clean, so those unused type imports would
 * crash at runtime. `transpileModule` performs proper import elision,
 * letting us run the real source (and measure coverage on it) without
 * rewriting the library.
 *
 * The query-string cache-bust the runner appends (`?t=N`) is stripped
 * before reading the file from disk.
 */
export const load = async (
  url: string,
  context: LoadContext,
  next: NextLoad,
): Promise<LoadResult> => {
  if (!isLocalTs(url)) {
    return next(url, context);
  }
  const file = fileURLToPath(stripQuery(url));
  const source = readFileSync(file, "utf8");
  return {
    format: "module",
    source: transpile(source, file),
    shortCircuit: true,
  };
};

/**
 * Transpiles a `.ts` source to ESM JS with an INLINE source map. The
 * source map is what makes coverage accurate: `transpileModule`
 * reflows multi-line constructs (so output line numbers differ from
 * source), and the coverage collector remaps V8's output-line hits
 * back to original source lines through this map. Shared with the
 * coverage collector so both transpile identically.
 */
export const transpile = (
  source: string,
  file: string,
): string =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      inlineSourceMap: true,
      verbatimModuleSyntax: false,
    },
    fileName: file,
  }).outputText;

const isLocalTs = (url: string): boolean => {
  const path = stripQuery(url);
  return (
    path.startsWith("file:") &&
    path.endsWith(".ts")
  );
};

const stripQuery = (url: string): string => {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
};
