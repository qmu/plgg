/**
 * Build-time indexer — the node half of the PoC. Reads
 * the REAL corpus (packages/guide, every .md — the same
 * corpus PoC 1 proved its FTS arm on, so grounding and
 * citation quality are judged on familiar ground), chunks
 * it by heading path with PoC 1's chunker, and writes the
 * one browser-shippable asset dist/index/fts.json.
 *
 * Run AFTER the app bundle (`npm run build` chains
 * build:app → build:index) because plgg-bundle's atomic
 * dist publish REPLACES dist/ — index assets written
 * first would be wiped.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  globSync,
} from "node:fs";
import { join, relative } from "node:path";
import { type SoftStr } from "plgg";
import {
  chunkMarkdown,
  buildFtsIndex,
} from "../poc1.ts";

const GUIDE_ROOT = join(
  process.cwd(),
  "..",
  "guide",
);
const OUT_DIR = join(
  process.cwd(),
  "dist",
  "index",
);

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

const seeds = files.flatMap((file) =>
  chunkMarkdown(
    relative(GUIDE_ROOT, join(GUIDE_ROOT, file)),
    readFileSync(join(GUIDE_ROOT, file), "utf8"),
  ),
);

const started = performance.now();
const index = buildFtsIndex(seeds);
const buildMs = performance.now() - started;

mkdirSync(OUT_DIR, { recursive: true });
const ftsJson = JSON.stringify(index);
writeFileSync(join(OUT_DIR, "fts.json"), ftsJson);
console.log(
  `fts.json: ${index.chunks.length} chunks from ${files.length} files, ${ftsJson.length} bytes, built in ${Math.round(buildMs)}ms`,
);
