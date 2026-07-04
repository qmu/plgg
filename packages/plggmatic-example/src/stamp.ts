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
const bundle = readFileSync(
  join(root, "dist", "main.js"),
);
const hash = createHash("sha256")
  .update(bundle)
  .digest("hex")
  .slice(0, 8);
// Target the script src attribute specifically — a bare
// "./main.js" replace would hit the explanatory comment
// above the mount point first and stamp that instead.
const html = readFileSync(
  join(root, "index.html"),
  "utf8",
).replace(
  'src="./main.js"',
  `src="./main.js?v=${hash}"`,
);
writeFileSync(
  join(root, "dist", "index.html"),
  html,
);
console.log(
  `stamp: dist/index.html -> ./main.js?v=${hash}`,
);
