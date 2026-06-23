import {
  existsSync,
} from "node:fs";
import {
  join,
} from "node:path";
import {
  pathToFileURL,
} from "node:url";

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
              srcRoot: line.slice(
                eq + 1,
              ),
            },
          ];
    });

const ALIASES = parseAliases();

// Resolves a self-alias specifier to a concrete src file URL, trying
// `<path>.ts` then `<path>/index.ts`. Returns the matched URL or the
// empty string when no alias applies (fall through).
const rewrite = (
  specifier: string,
): string => {
  const hit = ALIASES.find(
    (a) =>
      specifier === a.prefix ||
      specifier.startsWith(
        a.prefix + "/",
      ),
  );
  if (hit === undefined) {
    return "";
  }
  const rel =
    specifier === hit.prefix
      ? ""
      : specifier.slice(
          hit.prefix.length + 1,
        );
  const base =
    rel === ""
      ? hit.srcRoot
      : join(hit.srcRoot, rel);
  const asTs = base + ".ts";
  return existsSync(asTs)
    ? pathToFileURL(asTs).href
    : existsSync(
          join(base, "index.ts"),
        )
      ? pathToFileURL(
          join(base, "index.ts"),
        ).href
      : "";
};

// The Node loader-hook `resolve` contract.
type ResolveContext = {
  conditions: ReadonlyArray<string>;
  importAttributes: Record<
    string,
    string
  >;
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
) =>
  | ResolveResult
  | Promise<ResolveResult>;

export const resolve = async (
  specifier: string,
  context: ResolveContext,
  next: NextResolve,
): Promise<ResolveResult> => {
  const rewritten =
    rewrite(specifier);
  // Do NOT set `format`: leaving it undefined lets Node's native
  // type-stripping loader classify the resolved `.ts` file and strip
  // it. Forcing `format: "module"` would skip stripping and feed raw
  // TS to the JS parser.
  return rewritten === ""
    ? next(specifier, context)
    : {
        url: rewritten,
        shortCircuit: true,
      };
};
