import { spawnSync } from "plgg-bundle/vendors/nodeProc";
import {
  join,
  dirname,
  basename,
  relative,
} from "plgg-bundle/vendors/nodePath";
import {
  existsSync,
  writeFileSync,
  rmSync,
} from "plgg-bundle/vendors/nodeFs";
import { createRequire } from "plgg-bundle/vendors/nodeProc";
import { rewriteDtsAliases } from "plgg-bundle/domain/usecase/rewriteDtsAliases";

/**
 * Emit the per-file `.d.ts` tree for a package — the
 * single declaration mode every package uses. Rides on
 * the project's own `tsc` in declaration-only mode (no
 * new dependency); a single rolled-up `index.d.ts` was
 * a vite-plugin-dts stylistic choice, not a correctness
 * requirement, so it is dropped (breaking-changes-OK)
 * to keep the bundler at zero new dependencies. Throws
 * on a tsc failure.
 *
 * `emitDeclarationOnly` guarantees no `.js`/`.js.map`
 * leaks into `dist` (the reproduction trap). The
 * synthesized config reuses the package's
 * `tsconfig.build.json` when present, else
 * `tsconfig.json`, and adds the two things the
 * declaration build needs but the package config must
 * not carry permanently:
 * - `emitDeclarationOnly` (the package config drives
 *   `tsc --noEmit` type-checking),
 * - exclusion of `*.spec.ts` and `dist`. Spec files are
 *   not published API and, in a clean build, would pull
 *   the package's own not-yet-built dist types through
 *   plgg-test; excluding them also avoids the TS5055
 *   "overwrite input" collision with a prior `dist`.
 */
export const emitDts = (args: {
  root: string;
  rootDir: string;
  outDir: string;
  aliasPrefix: string;
}): void => {
  const project = tsconfigFor(args.root);
  const dtsConfig = join(
    args.root,
    "tsconfig.dts.json",
  );
  // tsc must emit into the SAME staging dir the JS bundles
  // went to (args.outDir), overriding the `outDir: "dist"`
  // the package config carries, so the whole `dist` is
  // published atomically by the caller's single swap.
  writeFileSync(
    dtsConfig,
    dtsTsconfig(
      basename(project),
      relative(args.root, args.outDir),
    ),
    "utf8",
  );
  // tsc invocation seam: run the package's OWN pinned
  // `tsc` directly via `node` — NOT `npx`. `npx` re-runs
  // its own resolution each call and, on a loaded
  // machine, can intermittently resolve/launch `tsc`
  // differently (the non-deterministic dts-emit flake
  // Planner caught). Resolving the local binary makes
  // the compiler, its version, and its module resolution
  // identical every run.
  const r = spawnSync(
    process.execPath,
    [tscBin(args.root), "--project", dtsConfig],
    { cwd: args.root, encoding: "utf8" },
  );
  rmSync(dtsConfig, { force: true });
  if (r.status !== 0) {
    throw new Error(
      `DtsError: tsc declaration emit failed\n${
        r.stdout ?? ""
      }${r.stderr ?? ""}`,
    );
  }
  // Relativize the self-alias in the declarations (tsc
  // leaves `paths` aliases verbatim; consumers have no
  // such alias).
  rewriteDtsAliases(
    args.outDir,
    args.aliasPrefix,
  );
};

/**
 * The synthesized declaration-emit tsconfig, extending
 * the package's base config.
 */
const dtsTsconfig = (
  baseName: string,
  outRel: string,
): string =>
  JSON.stringify(
    {
      extends: `./${baseName}`,
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        // Emit into the caller's staging dir, not the
        // live `dist` (overrides the package config).
        outDir: outRel,
        // No incremental cache: a `.tsbuildinfo` could
        // otherwise persist a stale module resolution
        // across runs. Each emit is a clean resolution.
        incremental: false,
        composite: false,
      },
      exclude: [
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "dist",
        `${outRel}`,
        "node_modules",
      ],
    },
    null,
    2,
  );

/**
 * Absolute path to the package's OWN pinned `tsc`
 * launcher, resolved from its `typescript` dependency
 * (derived from the package main so it works regardless
 * of `typescript`'s `exports` map). Run via `node`.
 */
const tscBin = (root: string): string =>
  join(
    dirname(
      createRequire(
        join(root, "package.json"),
      ).resolve("typescript"),
    ),
    "..",
    "bin",
    "tsc",
  );

/**
 * Pick the tsconfig that drives declaration emit:
 * `tsconfig.build.json` when the package carries one,
 * otherwise `tsconfig.json`.
 */
const tsconfigFor = (root: string): string =>
  existsSync(join(root, "tsconfig.build.json"))
    ? join(root, "tsconfig.build.json")
    : join(root, "tsconfig.json");
