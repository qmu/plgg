// Shared launcher preamble for the run-from-source plgg CLIs.
//
// These tools run their `src/**/*.ts` entry directly and rely on Node stripping
// types on load. Node refuses to strip types for `.ts` files under
// `node_modules`, so a registry-installed tool cannot run in place. This helper
// copies the package to a version-stamped dir OUTSIDE `node_modules` (with the
// tool's own deps reachable via a `node_modules` symlink) and re-execs the copy
// there. On a monorepo `file:` link the package realpath is already outside
// `node_modules`, so it is a no-op.
//
// Plain `.mjs`, Node built-ins only — it runs at process entry, before any
// resolver hook is registered.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const isUnderNodeModules = (p) =>
  p.split(sep).includes("node_modules");

// Relocate the calling launcher's package out of node_modules and re-exec, or
// return (no-op) when already outside it. Exits the process on re-exec.
export const relocateOutOfNodeModules = (
  launcherUrl,
  launcherBinName,
) => {
  const binDir = dirname(
    fileURLToPath(launcherUrl),
  );
  const pkgRoot = realpathSync(
    join(binDir, ".."),
  );
  if (!isUnderNodeModules(pkgRoot)) {
    return;
  }

  const pkg = JSON.parse(
    readFileSync(
      join(pkgRoot, "package.json"),
      "utf8",
    ),
  );
  const dest = join(
    tmpdir(),
    `plgg-relocate-${pkg.name}-${pkg.version}`,
  );
  const ready = join(
    dest,
    ".plgg-relocate-ready",
  );

  if (!existsSync(ready)) {
    rmSync(dest, {
      recursive: true,
      force: true,
    });
    mkdirSync(dest, { recursive: true });
    for (const dir of ["src", "bin"]) {
      const from = join(pkgRoot, dir);
      if (existsSync(from)) {
        cpSync(from, join(dest, dir), {
          recursive: true,
        });
      }
    }
    cpSync(
      join(pkgRoot, "package.json"),
      join(dest, "package.json"),
    );
    // The tool's own deps (typescript; plgg for plgg-test) live in the
    // node_modules that CONTAINS this package (npm hoists there). Symlink it so
    // resolution from the relocated copy finds them.
    try {
      symlinkSync(
        dirname(pkgRoot),
        join(dest, "node_modules"),
        "dir",
      );
    } catch {
      // A pre-existing symlink from a concurrent run is fine.
    }
    writeFileSync(ready, "");
  }

  const child = spawnSync(
    process.execPath,
    [
      join(dest, "bin", launcherBinName),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  process.exit(child.status ?? 1);
};
