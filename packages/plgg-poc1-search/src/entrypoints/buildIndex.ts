/**
 * Build-time indexer — the node half of the PoC. Reads
 * the REAL corpus (packages/guide, every .md), chunks it
 * by heading path, and writes the browser-shippable
 * assets into dist/index/:
 *
 *   fts.json               inverted index + chunk text
 *   embeddings.json        MiniLM chunk vectors (local
 *                          model; omitted only if the
 *                          model fails to load)
 *   metrics.json           measured build facts the app
 *                          displays (sizes, times,
 *                          corpus shape)
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
import {
  type SoftStr,
  pipe,
  matchResult,
} from "plgg";
import { chunkMarkdown } from "../indexer/chunk.ts";
import { buildFtsIndex } from "../indexer/buildFts.ts";
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMS,
} from "../search/embedder.ts";
import type {
  Embedding,
  VectorRow,
} from "../search/rag.ts";
import { makeNodeEmbedder } from "../vendors/nodeEmbedder.ts";

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
    relative(
      GUIDE_ROOT,
      join(GUIDE_ROOT, file),
    ),
    readFileSync(
      join(GUIDE_ROOT, file),
      "utf8",
    ),
  ),
);

const ftsStarted = performance.now();
const index = buildFtsIndex(seeds);
const ftsMs = performance.now() - ftsStarted;

mkdirSync(OUT_DIR, { recursive: true });
const ftsJson = JSON.stringify(index);
writeFileSync(
  join(OUT_DIR, "fts.json"),
  ftsJson,
);
console.log(
  `fts.json: ${index.chunks.length} chunks from ${files.length} files, ${ftsJson.length} bytes, built in ${Math.round(ftsMs)}ms`,
);

const embedStarted = performance.now();
const embedded = await makeNodeEmbedder().then(
  matchResult(
    async (
      e: Error,
    ): Promise<
      | Readonly<{ bytes: number; ms: number }>
      | Readonly<{ absent: SoftStr }>
    > => ({
      absent: `local model failed to load: ${e.message}`,
    }),
    async (embed) => {
      // Sequential on purpose: one CPU, and the per-
      // chunk cost is itself a build metric.
      const rows: Array<VectorRow> = [];
      for (const chunk of index.chunks) {
        const vec = await embed(
          `${chunk.headingPath}\n${chunk.text}`,
        );
        pipe(
          vec,
          matchResult(
            (e: Error): void => {
              throw new Error(
                `chunk ${chunk.id} (${chunk.headingPath}) failed to embed: ${e.message}`,
              );
            },
            (v: Embedding): void => {
              rows.push([chunk.id, v]);
            },
          ),
        );
      }
      const body = JSON.stringify({
        model: EMBEDDING_MODEL,
        dims: EMBEDDING_DIMS,
        rows,
      });
      writeFileSync(
        join(OUT_DIR, "embeddings.json"),
        body,
      );
      return {
        bytes: body.length,
        ms:
          performance.now() - embedStarted,
      };
    },
  ),
);

const corpusBytes = files.reduce(
  (sum, file) =>
    sum +
    readFileSync(join(GUIDE_ROOT, file), "utf8")
      .length,
  0,
);

const metrics = {
  corpus: {
    files: files.length,
    chunks: index.chunks.length,
    bytes: corpusBytes,
  },
  fts: {
    bytes: ftsJson.length,
    buildMs: Math.round(ftsMs),
  },
  embeddings:
    "absent" in embedded
      ? { absent: embedded.absent }
      : {
          model: EMBEDDING_MODEL,
          dims: EMBEDDING_DIMS,
          bytes: embedded.bytes,
          buildMs: Math.round(embedded.ms),
        },
};
writeFileSync(
  join(OUT_DIR, "metrics.json"),
  JSON.stringify(metrics, null, 2),
);
console.log(
  "metrics.json:",
  JSON.stringify(metrics),
);
