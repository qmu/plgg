// Post-build step of the guide's `npm run build`:
// nest the plggmatic reference exhibit
// (packages/plggmatic-example/dist, built earlier by
// scripts/build.sh in dependency order) under the
// guide's dist at /plggmatic-reference/, so the one
// publisher — the assets-only Worker — serves it at
// plgg.qmu.co.jp/plggmatic-reference/.
//
// Ordering is load-bearing: `plggpress build` rm -rf's
// dist before writing, so this copy MUST run after it
// (package.json chains the two with `&&`).
//
// Like site.config.ts, this file is deliberately
// outside tsconfig.json's scope — that program is the
// Worker and nothing else. The build itself exercises
// this script on every run, and it fails loudly rather
// than shipping an empty or missing exhibit.
import {
  cpSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

const source = join(
  import.meta.dirname,
  "..",
  "plggmatic-example",
  "dist",
);
const target = join(
  import.meta.dirname,
  "dist",
  "plggmatic-reference",
);

if (!existsSync(join(source, "demo1.html"))) {
  console.error(
    `nest-exhibit: ${source} has no demo1.html — ` +
      "build packages/plggmatic-example first " +
      "(scripts/build.sh does, in dependency order)",
  );
  process.exit(1);
}

cpSync(source, target, { recursive: true });

const copied: number = readdirSync(target).length;
if (copied < 10) {
  console.error(
    `nest-exhibit: only ${copied} files in ` +
      `${target} — expected the exhibit's five ` +
      "pages and five bundles",
  );
  process.exit(1);
}
console.log(
  `nest-exhibit: ${copied} files -> ` +
    "dist/plggmatic-reference/",
);
