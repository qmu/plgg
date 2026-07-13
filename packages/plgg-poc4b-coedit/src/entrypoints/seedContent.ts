/**
 * Seed (or re-seed) the agent-editable corpus COPY — the
 * locked design decision inherited from PoC 4: the agent
 * writes `content/` (git-ignored), never `packages/guide`
 * itself, so the real guide can never accumulate
 * uncommitted AI edits and reset is just running this
 * again (`npm run reset-content`).
 *
 * Unlike PoC 4 this copies ONLY the guide `*.md` files
 * (structure preserved) — no `site.config.ts`: 4b renders
 * the document in its own live preview surface, not
 * through a plggpress dev server, so it needs the raw
 * markdown and nothing else.
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

console.log(
  `content/: seeded ${files.length} markdown files from packages/guide`,
);
