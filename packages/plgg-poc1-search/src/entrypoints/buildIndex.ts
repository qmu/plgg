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
import {
  type FtsIndex,
  buildFtsIndex,
} from "../indexer/buildFts.ts";
import { searchFts } from "../search/fts.ts";
import type { CjkStrategy } from "../search/tokenize.ts";
import type {
  JaArm,
  JaHit,
  JaQueryRow,
  JaReport,
} from "../jaReport.ts";
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

/* ------------------------------------------------ *
 * Japanese CJK-tokenizer measurement (Ticket B)     *
 * ------------------------------------------------ *
 * The REAL qmu.co.jp Japanese policy corpus, vendored
 * under corpus-ja/ so this is reproducible without the
 * out-of-repo ../qmu-co-jp. Three arms: the latin-only
 * baseline (indexes Japanese to ~0 tokens — the honest
 * failure the current tokenizer has) vs Intl.Segmenter
 * vs bigram. Sizes and canned-query hits are precomputed
 * here and shipped as one small ja-report.json the page
 * renders. */
const JA_ROOT = join(
  process.cwd(),
  "corpus-ja",
);

const jaFiles: ReadonlyArray<SoftStr> = globSync(
  "*.md",
  { cwd: JA_ROOT },
).sort();

const jaSeeds = jaFiles.flatMap((file) =>
  chunkMarkdown(
    file,
    readFileSync(
      join(JA_ROOT, file),
      "utf8",
    ),
  ),
);

const JA_STRATEGIES: ReadonlyArray<CjkStrategy> =
  ["none", "segmenter", "bigram"];

// Real questions grounded in the policy corpus.
const JA_QUERIES: ReadonlyArray<SoftStr> = [
  "モードレスなUI設計",
  "型駆動設計とエスケープハッチ",
  "情報セキュリティのコミットメント",
  "AIエージェントが操作できること",
  "オプション型とnullの扱い",
];

const jaIndexes = new Map<
  CjkStrategy,
  FtsIndex
>();
const jaArms: Array<JaArm> = [];
for (const strategy of JA_STRATEGIES) {
  const started = performance.now();
  const index = buildFtsIndex(
    jaSeeds,
    strategy,
  );
  const ms = performance.now() - started;
  jaIndexes.set(strategy, index);
  jaArms.push({
    strategy,
    ftsBytes: JSON.stringify(index).length,
    vocab: Object.keys(index.postings).length,
    tokens: index.chunks.reduce(
      (sum, chunk) => sum + chunk.len,
      0,
    ),
    buildMs: Math.round(ms),
  });
}

const jaHitsFor = (
  strategy: CjkStrategy,
  query: SoftStr,
): ReadonlyArray<JaHit> => {
  const index = jaIndexes.get(strategy);
  if (index === undefined) {
    return [];
  }
  return searchFts(index)(query, 3).map(
    (scored): JaHit => ({
      headingPath:
        index.chunks[scored.id]?.headingPath ??
        "",
      score: scored.score,
    }),
  );
};

const jaQueries: ReadonlyArray<JaQueryRow> =
  JA_QUERIES.map(
    (query): JaQueryRow => ({
      query,
      hits: {
        none: jaHitsFor("none", query),
        segmenter: jaHitsFor(
          "segmenter",
          query,
        ),
        bigram: jaHitsFor("bigram", query),
      },
    }),
  );

const jaCorpusBytes = jaFiles.reduce(
  (sum, file) =>
    sum +
    readFileSync(join(JA_ROOT, file), "utf8")
      .length,
  0,
);

const jaReport: JaReport = {
  corpus: {
    files: jaFiles.length,
    chunks: jaSeeds.length,
    bytes: jaCorpusBytes,
  },
  arms: jaArms,
  queries: jaQueries,
};
writeFileSync(
  join(OUT_DIR, "ja-report.json"),
  JSON.stringify(jaReport, null, 2),
);

// The segmenter arm, shipped whole so the dedicated
// Japanese search box can rank over it live (the
// recommended arm — compact, dictionary-quality).
const jaSegmenter = jaIndexes.get("segmenter");
if (jaSegmenter !== undefined) {
  writeFileSync(
    join(OUT_DIR, "ja-fts.json"),
    JSON.stringify(jaSegmenter),
  );
}
console.log(
  `ja-report.json: ${jaSeeds.length} chunks from ${jaFiles.length} JA files; ${jaArms
    .map(
      (a) =>
        `${a.strategy}=${a.tokens}tok/${a.vocab}vocab`,
    )
    .join(", ")}`,
);
