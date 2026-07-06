/**
 * Build-time cache-buster (run by `npm run build` after
 * the bundle is written): stamps the bundle's content
 * hash into the module URL in `dist/index.html`
 * (`./main.js?v=<hash>`). Intermediaries cache `.js`
 * aggressively (a CDN edge in front of this app caches
 * scripts by default but not HTML), so a fresh HTML must
 * point at a URL that misses the cache whenever the
 * bundle's bytes change — same-content rebuilds keep the
 * same URL and stay cached.
 */
import {
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = process.cwd();

// Stamp each page's bundle content hash into its script
// URL, so a CDN edge serving the old `.js` is bypassed
// whenever the bytes change. One entry per HTML page /
// bundle pair (the workbench + the ticket-09 scheduler
// demo).
const pages: ReadonlyArray<
  readonly [string, string]
> = [
  ["index.html", "main.js"],
  ["forms.html", "forms.js"],
  ["demo1.html", "demo1.js"],
  ["demo2.html", "demo2.js"],
];

for (const [page, bundleName] of pages) {
  const bundle = readFileSync(
    join(root, "dist", bundleName),
  );
  const hash = createHash("sha256")
    .update(bundle)
    .digest("hex")
    .slice(0, 8);
  // Target the script src specifically — a bare
  // "./x.js" replace could hit an explanatory comment
  // above the mount point first and stamp that instead.
  const html = readFileSync(
    join(root, page),
    "utf8",
  ).replace(
    `src="./${bundleName}"`,
    `src="./${bundleName}?v=${hash}"`,
  );
  writeFileSync(join(root, "dist", page), html);
  console.log(
    `stamp: dist/${page} -> ./${bundleName}?v=${hash}`,
  );
}
