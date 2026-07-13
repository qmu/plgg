/**
 * Seed (or re-seed) the agent-editable corpus COPY — the
 * locked design decision: the agent writes `content/`
 * (git-ignored), never `packages/guide` itself, so the
 * real guide can never accumulate uncommitted AI edits
 * and reset is just running this again
 * (`npm run reset-content`).
 *
 * Copies every guide `*.md` (structure preserved) plus
 * `site.config.ts`, so the plggpress dev server renders
 * the copy with the guide's real chrome (sidebar, nav,
 * theme).
 */
import {
  rmSync,
  mkdirSync,
  copyFileSync,
  globSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { type SoftStr } from "plgg";

const GUIDE_ROOT = join(
  process.cwd(),
  "..",
  "guide",
);
const CONTENT = join(process.cwd(), "content");

const files: ReadonlyArray<SoftStr> = globSync(
  "**/*.md",
  {
    cwd: GUIDE_ROOT,
    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
    ],
  },
).sort();

rmSync(CONTENT, {
  recursive: true,
  force: true,
});
mkdirSync(CONTENT, { recursive: true });

for (const file of files) {
  const dest = join(CONTENT, file);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(GUIDE_ROOT, file), dest);
}

copyFileSync(
  join(GUIDE_ROOT, "site.config.ts"),
  join(CONTENT, "site.config.ts"),
);

console.log(
  `content/: seeded ${files.length} markdown files + site.config.ts from packages/guide`,
);
