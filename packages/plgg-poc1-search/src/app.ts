/**
 * PoC 1 — browser search core. One Elm-Architecture
 * program comparing the two search arms side-by-side on
 * the real guide corpus:
 *
 *   FTS   from-scratch BM25 over the shipped inverted
 *         index (always on — graceful-degradation arm)
 *   RAG   MiniLM cosine top-k over shipped chunk vectors,
 *         query embedded in-browser by the CDN-loaded
 *         local model (loads lazily on first use; its
 *         download/init cost is a displayed metric)
 *
 * The submitted query lives in the URL (`?q=…`) so every
 * comparison is deep-linkable; a benchmark over the
 * canned query set measures per-arm latency p50/p95.
 */
import {
  type SoftStr,
  type Result,
  type Option,
  ok,
  err,
  some,
  none,
  matchOption,
  matchResult,
  fromNullable,
  pipe,
  getOr,
} from "plgg";
import {
  type Application,
  type Cmd,
  cmdNone,
  cmdEffect,
  makeUrl,
} from "plgg-view/client";
import {
  type QueryCodec,
  parseQuery,
  serializeQuery,
  queryStr,
  writeField,
} from "plgg-router";
import type { FtsIndex } from "./indexer/buildFts.ts";
import {
  type Scored,
  searchFts,
} from "./search/fts.ts";
import {
  type VectorIndex,
  type ScoredVector,
  topK,
} from "./search/rag.ts";
import { EMBEDDING_MODEL } from "./search/embedder.ts";
import { ensureBrowserEmbedder } from "./vendors/browserEmbedder.ts";
import { view } from "./view.ts";

export const RESULT_COUNT = 5;

/** The ~10 canned guide questions the benchmark runs. */
export const CANNED_QUERIES: ReadonlyArray<SoftStr> =
  [
    "how do I handle errors without throwing",
    "option instead of null",
    "what is proc and the error channel",
    "define a branded type with a caster",
    "route parameters in the router",
    "test coverage thresholds",
    "bundle a package for the browser",
    "markdown rendering and code highlighting",
    "http server request response model",
    "parser combinators and backtracking",
  ];

/** Build facts fetched from metrics.json. */
export type BuildMetrics = Readonly<{
  corpus: Readonly<{
    files: number;
    chunks: number;
    bytes: number;
  }>;
  fts: Readonly<{
    bytes: number;
    buildMs: number;
  }>;
  embeddings:
    | Readonly<{
        model: SoftStr;
        dims: number;
        bytes: number;
        buildMs: number;
      }>
    | Readonly<{ absent: SoftStr }>;
}>;

/** Everything the app fetches before it can search. */
export type Assets = Readonly<{
  fts: FtsIndex;
  vectors: Option<VectorIndex>;
  metrics: BuildMetrics;
}>;

export type AssetsPhase =
  | Readonly<{ kind: "loading" }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>
  | Readonly<{ kind: "ready"; assets: Assets }>;

/** The lazily loaded in-browser embedding model. */
export type ModelPhase =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; initMs: number }>
  | Readonly<{
      kind: "failed";
      reason: SoftStr;
    }>;

export type FtsOutcome = Readonly<{
  hits: ReadonlyArray<Scored>;
  ms: number;
}>;

export type RagOutcome =
  | Readonly<{
      kind: "hits";
      hits: ReadonlyArray<ScoredVector>;
      embedMs: number;
      rankMs: number;
    }>
  | Readonly<{
      kind: "unavailable";
      reason: SoftStr;
    }>;

/** One benchmark row: a canned query, both arms. */
export type BenchRow = Readonly<{
  query: SoftStr;
  fts: FtsOutcome;
  rag: RagOutcome;
}>;

export type LatencyStats = Readonly<{
  p50: number;
  p95: number;
}>;

export type BenchPhase =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "running" }>
  | Readonly<{
      kind: "done";
      rows: ReadonlyArray<BenchRow>;
      fts: LatencyStats;
      rag: Option<LatencyStats>;
    }>;

export type Model = Readonly<{
  /** The search box draft (not yet submitted). */
  draft: SoftStr;
  /** The submitted, URL-reflected query. */
  q: SoftStr;
  assets: AssetsPhase;
  model: ModelPhase;
  fts: Option<FtsOutcome>;
  rag: Option<RagOutcome>;
  bench: BenchPhase;
}>;

export type Msg =
  | Readonly<{
      kind: "AssetsLoaded";
      result: Result<Assets, Error>;
    }>
  | Readonly<{
      kind: "DraftChanged";
      value: SoftStr;
    }>
  | Readonly<{ kind: "Submitted" }>
  | Readonly<{
      kind: "UrlChanged";
      q: SoftStr;
    }>
  | Readonly<{
      kind: "FtsRan";
      outcome: FtsOutcome;
    }>
  | Readonly<{
      kind: "ModelBecame";
      phase: ModelPhase;
    }>
  | Readonly<{
      kind: "RagRan";
      outcome: RagOutcome;
    }>
  | Readonly<{ kind: "BenchRequested" }>
  | Readonly<{
      kind: "BenchDone";
      rows: ReadonlyArray<BenchRow>;
      fts: LatencyStats;
      rag: Option<LatencyStats>;
    }>;

export const init: Model = {
  draft: "",
  q: "",
  assets: { kind: "loading" },
  model: { kind: "idle" },
  fts: none(),
  rag: none(),
  bench: { kind: "idle" },
};

/* ------------------------------------------------ *
 * Effects (all returned as data from `update`)      *
 * ------------------------------------------------ */

const fetchJson = (
  path: SoftStr,
): Promise<unknown> =>
  fetch(path).then((res) =>
    res.ok
      ? res.json()
      : Promise.reject(
          new Error(`${path} → ${res.status}`),
        ),
  );

/**
 * Boundary decode: the assets are produced by this
 * package's own build entry, so a structural sanity check
 * (arrays where arrays must be) guards fetch mix-ups
 * without re-validating every one of thousands of rows.
 */
const decodeAssets = (
  raw: readonly [unknown, unknown, unknown],
): Result<Assets, Error> => {
  const [fts, vectors, metrics] = raw;
  const looksFts =
    typeof fts === "object" &&
    fts !== null &&
    "chunks" in fts &&
    "postings" in fts &&
    Array.isArray(
      Reflect.get(fts, "chunks"),
    );
  const looksMetrics =
    typeof metrics === "object" &&
    metrics !== null &&
    "corpus" in metrics;
  if (!looksFts || !looksMetrics) {
    return err(
      new Error(
        "index assets have an unexpected shape — rebuild with `npm run build`",
      ),
    );
  }
  const vectorIndex: Option<VectorIndex> =
    typeof vectors === "object" &&
    vectors !== null &&
    "rows" in vectors &&
    Array.isArray(Reflect.get(vectors, "rows"))
      ? some(vectorIndexOf(vectors))
      : none();
  return ok({
    fts: ftsOf(fts),
    vectors: vectorIndex,
    metrics: metricsOf(metrics),
  });
};

const loadAssets: Cmd<Msg> = cmdEffect(() =>
  Promise.all([
    fetchJson("./index/fts.json"),
    fetchJson("./index/embeddings.json").catch(
      (): unknown => null,
    ),
    fetchJson("./index/metrics.json"),
  ]).then(
    (raw): Msg => ({
      kind: "AssetsLoaded",
      result: decodeAssets(raw),
    }),
    (cause): Msg => ({
      kind: "AssetsLoaded",
      result: err(
        cause instanceof Error
          ? cause
          : new Error(String(cause)),
      ),
    }),
  ),
);

const runFts = (
  index: FtsIndex,
  q: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() => {
    const started = performance.now();
    const hits = searchFts(index)(
      q,
      RESULT_COUNT,
    );
    return Promise.resolve<Msg>({
      kind: "FtsRan",
      outcome: {
        hits,
        ms: performance.now() - started,
      },
    });
  });

const ragUnavailable = (
  reason: SoftStr,
): Msg => ({
  kind: "RagRan",
  outcome: { kind: "unavailable", reason },
});

const runRag = (
  vectors: Option<VectorIndex>,
  q: SoftStr,
): Cmd<Msg> =>
  cmdEffect(() =>
    pipe(
      vectors,
      matchOption(
        () =>
          Promise.resolve(
            ragUnavailable(
              "embeddings.json was not built (local model unavailable at build time)",
            ),
          ),
        (vindex: VectorIndex) =>
          vindex.model !== EMBEDDING_MODEL
            ? Promise.resolve(
                ragUnavailable(
                  `embeddings are ${vindex.model}, app embeds with ${EMBEDDING_MODEL} — spaces don't match`,
                ),
              )
            : ensureBrowserEmbedder().then(
                matchResult(
                  (e: Error): Promise<Msg> =>
                    Promise.resolve(
                      ragUnavailable(e.message),
                    ),
                  (loaded): Promise<Msg> => {
                    const embedStarted =
                      performance.now();
                    return loaded
                      .embed(q)
                      .then(
                        matchResult(
                          (e: Error): Msg =>
                            ragUnavailable(
                              e.message,
                            ),
                          (vec): Msg => {
                            const embedMs =
                              performance.now() -
                              embedStarted;
                            const rankStarted =
                              performance.now();
                            const hits = topK(
                              vec,
                              vindex.rows,
                              RESULT_COUNT,
                            );
                            return {
                              kind: "RagRan",
                              outcome: {
                                kind: "hits",
                                hits,
                                embedMs,
                                rankMs:
                                  performance.now() -
                                  rankStarted,
                              },
                            };
                          },
                        ),
                      );
                  },
                ),
              ),
      ),
    ),
  );

/** Watch the lazy model load for status display. */
const watchModel: Cmd<Msg> = cmdEffect(() =>
  ensureBrowserEmbedder().then(
    matchResult(
      (e: Error): Msg => ({
        kind: "ModelBecame",
        phase: {
          kind: "failed",
          reason: e.message,
        },
      }),
      (loaded): Msg => ({
        kind: "ModelBecame",
        phase: {
          kind: "ready",
          initMs: loaded.initMs,
        },
      }),
    ),
  ),
);

const percentile = (
  sorted: ReadonlyArray<number>,
  p: number,
): number =>
  pipe(
    fromNullable(
      sorted[
        Math.min(
          sorted.length - 1,
          Math.floor(
            (p / 100) * sorted.length,
          ),
        )
      ],
    ),
    getOr(0),
  );

const statsOf = (
  samples: ReadonlyArray<number>,
): LatencyStats => {
  const sorted = [...samples].sort(
    (a, b) => a - b,
  );
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
  };
};

/**
 * The benchmark: every canned query through both arms,
 * sequentially (one CPU — parallel runs would poison the
 * latency numbers).
 */
const runBench = (
  assets: Assets,
): Cmd<Msg> =>
  cmdEffect(async () => {
    const rows: Array<BenchRow> = [];
    const ftsSamples: Array<number> = [];
    const ragSamples: Array<number> = [];
    for (const query of CANNED_QUERIES) {
      const ftsStarted = performance.now();
      const ftsHits = searchFts(assets.fts)(
        query,
        3,
      );
      const ftsMs =
        performance.now() - ftsStarted;
      ftsSamples.push(ftsMs);
      const rag: RagOutcome = await pipe(
        assets.vectors,
        matchOption(
          () =>
            Promise.resolve<RagOutcome>({
              kind: "unavailable",
              reason:
                "embeddings.json was not built",
            }),
          (vindex: VectorIndex) =>
            ensureBrowserEmbedder().then(
              matchResult(
                (e: Error) =>
                  Promise.resolve<RagOutcome>({
                    kind: "unavailable",
                    reason: e.message,
                  }),
                (loaded) => {
                  const embedStarted =
                    performance.now();
                  return loaded
                    .embed(query)
                    .then(
                      matchResult(
                        (
                          e: Error,
                        ): RagOutcome => ({
                          kind: "unavailable",
                          reason: e.message,
                        }),
                        (vec): RagOutcome => {
                          const embedMs =
                            performance.now() -
                            embedStarted;
                          const rankStarted =
                            performance.now();
                          const hits = topK(
                            vec,
                            vindex.rows,
                            3,
                          );
                          const rankMs =
                            performance.now() -
                            rankStarted;
                          ragSamples.push(
                            embedMs + rankMs,
                          );
                          return {
                            kind: "hits",
                            hits,
                            embedMs,
                            rankMs,
                          };
                        },
                      ),
                    );
                },
              ),
            ),
        ),
      );
      rows.push({ query, fts: { hits: ftsHits, ms: ftsMs }, rag });
    }
    return {
      kind: "BenchDone",
      rows,
      fts: statsOf(ftsSamples),
      rag:
        ragSamples.length === 0
          ? none()
          : some(statsOf(ragSamples)),
    };
  });

/* ------------------------------------------------ *
 * Update                                            *
 * ------------------------------------------------ */

const search = (
  model: Model,
  q: SoftStr,
): readonly [Model, Cmd<Msg>] =>
  model.assets.kind !== "ready" || q === ""
    ? [
        {
          ...model,
          q,
          draft: q,
          fts: none(),
          rag: none(),
        },
        cmdNone(),
      ]
    : [
        {
          ...model,
          q,
          draft: q,
          fts: none(),
          rag: none(),
          model:
            model.model.kind === "idle"
              ? { kind: "loading" }
              : model.model,
        },
        cmdBatchOf([
          runFts(model.assets.assets.fts, q),
          runRag(model.assets.assets.vectors, q),
          ...(model.model.kind === "idle"
            ? [watchModel]
            : []),
        ]),
      ];

// plgg-view exposes cmdBatch on the client barrel; alias
// through one spot so the import list stays tidy.
import { cmdBatch } from "plgg-view/client";
const cmdBatchOf = (
  cmds: ReadonlyArray<Cmd<Msg>>,
): Cmd<Msg> => cmdBatch(cmds);

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "AssetsLoaded":
      return pipe(
        msg.result,
        matchResult(
          (e: Error): readonly [
            Model,
            Cmd<Msg>,
          ] => [
            {
              ...model,
              assets: {
                kind: "failed",
                reason: e.message,
              },
            },
            cmdNone(),
          ],
          (assets: Assets): readonly [
            Model,
            Cmd<Msg>,
          ] =>
            model.q === ""
              ? [
                  {
                    ...model,
                    assets: {
                      kind: "ready",
                      assets,
                    },
                  },
                  cmdNone(),
                ]
              : search(
                  {
                    ...model,
                    assets: {
                      kind: "ready",
                      assets,
                    },
                  },
                  model.q,
                ),
        ),
      );
    case "DraftChanged":
      return [
        { ...model, draft: msg.value },
        cmdNone(),
      ];
    case "Submitted":
      return search(model, model.draft.trim());
    case "UrlChanged":
      return msg.q === model.q
        ? [model, cmdNone()]
        : search(model, msg.q);
    case "FtsRan":
      return [
        { ...model, fts: some(msg.outcome) },
        cmdNone(),
      ];
    case "ModelBecame":
      return [
        { ...model, model: msg.phase },
        cmdNone(),
      ];
    case "RagRan":
      return [
        { ...model, rag: some(msg.outcome) },
        cmdNone(),
      ];
    case "BenchRequested":
      return model.assets.kind !== "ready" ||
        model.bench.kind === "running"
        ? [model, cmdNone()]
        : [
            {
              ...model,
              bench: { kind: "running" },
              model:
                model.model.kind === "idle"
                  ? { kind: "loading" }
                  : model.model,
            },
            cmdBatchOf([
              runBench(model.assets.assets),
              ...(model.model.kind === "idle"
                ? [watchModel]
                : []),
            ]),
          ];
    case "BenchDone":
      return [
        {
          ...model,
          bench: {
            kind: "done",
            rows: msg.rows,
            fts: msg.fts,
            rag: msg.rag,
          },
        },
        cmdNone(),
      ];
  }
};

/* ------------------------------------------------ *
 * URL codec (?q=…)                                  *
 * ------------------------------------------------ */

const qField = queryStr("");

type UrlState = Readonly<{ q: SoftStr }>;

const queryCodec: QueryCodec<UrlState> = {
  decode: (query) => ({
    q: qField.decode(fromNullable(query["q"])),
  }),
  encode: (value) => ({
    ...writeField("q", qField.encode(value.q)),
  }),
};

export const app: Application<Model, Msg> = {
  init: (url) => {
    const { q } = queryCodec.decode(
      parseQuery(url.search),
    );
    return [
      { ...init, q, draft: q },
      loadAssets,
    ];
  },
  update,
  view,
  onUrlChange: (url) => {
    const { q } = queryCodec.decode(
      parseQuery(url.search),
    );
    return { kind: "UrlChanged", q };
  },
  toUrl: (model) =>
    makeUrl(
      "/",
      serializeQuery(
        queryCodec.encode({ q: model.q }),
      ),
    ),
};

/* ------------------------------------------------ *
 * Boundary re-shapers (assets arrive as unknown)    *
 * ------------------------------------------------ */

// The three JSON assets are emitted by this package's own
// buildIndex entry, so these re-shapers only re-key the
// parsed values onto the typed shapes after decodeAssets'
// structural check — they never invent data.
const ftsOf = (raw: object): FtsIndex => {
  const chunks: unknown = Reflect.get(
    raw,
    "chunks",
  );
  const postings: unknown = Reflect.get(
    raw,
    "postings",
  );
  const avgLen: unknown = Reflect.get(
    raw,
    "avgLen",
  );
  return {
    chunks: Array.isArray(chunks) ? chunks : [],
    postings:
      typeof postings === "object" &&
      postings !== null
        ? Object.fromEntries(
            Object.entries(postings).filter(
              ([, v]) => Array.isArray(v),
            ),
          )
        : {},
    avgLen:
      typeof avgLen === "number" ? avgLen : 1,
  };
};

const vectorIndexOf = (
  raw: object,
): VectorIndex => {
  const model: unknown = Reflect.get(
    raw,
    "model",
  );
  const dims: unknown = Reflect.get(raw, "dims");
  const rows: unknown = Reflect.get(raw, "rows");
  return {
    model:
      typeof model === "string" ? model : "?",
    dims: typeof dims === "number" ? dims : 0,
    rows: Array.isArray(rows) ? rows : [],
  };
};

const metricsOf = (
  raw: object,
): BuildMetrics => {
  const corpus: unknown = Reflect.get(
    raw,
    "corpus",
  );
  const fts: unknown = Reflect.get(raw, "fts");
  const embeddings: unknown = Reflect.get(
    raw,
    "embeddings",
  );
  const num = (
    v: unknown,
    key: string,
  ): number => {
    const n =
      typeof v === "object" && v !== null
        ? Reflect.get(v, key)
        : 0;
    return typeof n === "number" ? n : 0;
  };
  const str = (
    v: unknown,
    key: string,
  ): SoftStr => {
    const s =
      typeof v === "object" && v !== null
        ? Reflect.get(v, key)
        : "";
    return typeof s === "string" ? s : "";
  };
  return {
    corpus: {
      files: num(corpus, "files"),
      chunks: num(corpus, "chunks"),
      bytes: num(corpus, "bytes"),
    },
    fts: {
      bytes: num(fts, "bytes"),
      buildMs: num(fts, "buildMs"),
    },
    embeddings:
      typeof embeddings === "object" &&
      embeddings !== null &&
      "absent" in embeddings
        ? { absent: str(embeddings, "absent") }
        : {
            model: str(embeddings, "model"),
            dims: num(embeddings, "dims"),
            bytes: num(embeddings, "bytes"),
            buildMs: num(
              embeddings,
              "buildMs",
            ),
          },
  };
};
