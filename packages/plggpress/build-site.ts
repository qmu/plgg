import {
  mkdirSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// plggpress's own site, built by plggpress. Its pages are
// the documents this package already keeps — nothing is
// written twice: they are gathered, built, and the
// gathering thrown away.
const content = ".site-content";
const out = "dist-site";
rmSync(content, { recursive: true, force: true });
mkdirSync(content, { recursive: true });
for (const [from, to] of [
  ["README.md", "index.md"],
  ["site/joining.md", "joining.md"],
  ["SHEET.md", "sheets.md"],
  ["OPERATIONS.md", "operations.md"],
] satisfies ReadonlyArray<
  readonly [string, string]
>)
  copyFileSync(from, join(content, to));
execFileSync(
  "node",
  [
    "bin/plggpress.mjs",
    "build",
    "--config",
    "site/site.config.ts",
    "--contentDir",
    content,
    "--outDir",
    out,
  ],
  { stdio: "inherit" },
);
rmSync(content, { recursive: true, force: true });
