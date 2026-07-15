/**
 * Seed (or re-seed) the sample-site corpus COPY — the
 * locked design decision inherited from PoC 4/4b: the PoC
 * renders a git-ignored COPY of the guide `*.md` files,
 * never `packages/guide` itself, so the real guide is
 * never touched and reset is just running this again
 * (`npm run reset-content`).
 *
 * PoC 5 needs only the markdown files' PATHS (and their
 * front matter) to derive the sample site the central
 * configuration classifies, excludes, and re-themes — so
 * this copies the `*.md` tree, structure preserved, and
 * nothing else.
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
