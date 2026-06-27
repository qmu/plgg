import { spawnSync } from "node:child_process";
import { join, basename } from "node:path";
import {
  existsSync,
  writeFileSync,
  rmSync,
} from "node:fs";
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
  writeFileSync(
    dtsConfig,
    dtsTsconfig(basename(project)),
    "utf8",
  );
  // tsc invocation seam: spawn the package's own
  // compiler in declaration-only mode. The synthesized
  // config guarantees no `.js` and no spec declarations.
  const r = spawnSync(
    "npx",
    ["tsc", "--project", dtsConfig],
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
const dtsTsconfig = (baseName: string): string =>
  JSON.stringify(
    {
      extends: `./${baseName}`,
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
      },
      exclude: [
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "dist",
        "node_modules",
      ],
    },
    null,
    2,
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
