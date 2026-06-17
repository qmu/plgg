// Auto-generate the exhaustive API reference for every plgg-family package and
// assemble a single VitePress sidebar for the "API reference" section.
//
// For each package we run TypeDoc (markdown + VitePress theme) against the
// package's OWN source `index.ts` using its OWN tsconfig, so cross-package
// types resolve through the built `dist` symlinks (the dependency-ordered build
// is a prerequisite — see workloads/development/Dockerfile and the deploy CI).
// Output lands in `api/<pkg>/`; each run also emits a `typedoc-sidebar.json`,
// which we wrap into a per-package group and merge into `api/typedoc-sidebar.json`.
// `.vitepress/config.ts` loads that merged file when present.
//
// Run: `npm run docs:api` (invoked by `npm run build` before `vitepress build`).

import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const guideRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packagesRoot = resolve(guideRoot, "..");
const apiDir = join(guideRoot, "api");

// The plgg family, in dependency order (matches the dev Dockerfile build
// order). Each is generated independently from its own source.
const PACKAGES = [
  "plgg",
  "plgg-http",
  "plgg-router",
  "plgg-view",
  "plgg-server",
  "plgg-fetch",
  "plgg-sql",
  "plgg-kit",
  "plgg-foundry",
];

const generate = (pkg) => {
  const pkgRoot = join(packagesRoot, pkg);
  const out = join(apiDir, pkg);
  // Clean stale output so removed exports don't linger.
  rmSync(out, { recursive: true, force: true });
  execFileSync(
    "npx",
    [
      "typedoc",
      "--options",
      join(guideRoot, "typedoc.base.json"),
      "--tsconfig",
      join(pkgRoot, "tsconfig.json"),
      "--entryPoints",
      join(pkgRoot, "src", "index.ts"),
      "--out",
      out,
    ],
    { cwd: guideRoot, stdio: "inherit" },
  );
};

// The per-package theme output writes a `typedoc-sidebar.json` of groups
// already linked under `/api/<pkg>/…`; wrap each as one collapsible group.
const collectSidebar = (pkg) => {
  const file = join(
    apiDir,
    pkg,
    "typedoc-sidebar.json",
  );
  const items = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : [];
  return {
    text: pkg,
    collapsed: true,
    link: `/api/${pkg}/`,
    items,
  };
};

for (const pkg of PACKAGES) {
  generate(pkg);
}

const sidebar = PACKAGES.map(collectSidebar);
writeFileSync(
  join(apiDir, "typedoc-sidebar.json"),
  JSON.stringify(sidebar, null, 2) + "\n",
);

console.log(
  `Generated API reference for ${PACKAGES.length} packages.`,
);
