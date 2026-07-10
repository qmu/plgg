/**
 * PoC 1's page: a search box (URL-held query), the two
 * arms' result panes side-by-side, the measured metrics
 * table, and the canned-query benchmark. All four UI
 * states are designed per arm (loading / empty / error /
 * success — self-explanatory-ui policy); the RAG arm's
 * unavailability is always an explained state, never a
 * blank pane.
 */
import {
  type SoftStr,
  type Option,
  matchOption,
  fromNullable,
  pipe,
} from "plgg";
import {
  type Html,
  type Flow,
  div,
  section,
  header,
  h1,
  h2,
  h3,
  p,
  a,
  form,
  input,
  button,
  table,
  thead,
  tbody,
  tr,
  th,
  td,
  text,
  href,
  attr,
  type_,
  value_,
  onInput,
  onSubmit,
  onClick,
} from "plgg-view";
import * as sx from "plgg-view/style";
import type { ChunkMeta } from "./indexer/buildFts.ts";
import type {
  Model,
  Msg,
  Assets,
  FtsOutcome,
  RagOutcome,
  BenchRow,
  LatencyStats,
} from "./app.ts";

const kb = (bytes: number): SoftStr =>
  `${(bytes / 1024).toFixed(1)} KB`;

const ms = (value: number): SoftStr =>
  `${value.toFixed(1)} ms`;

// noUncheckedIndexedAccess wrap; ids come from the same
// index, so a miss is a bug rendered as an honest cell.
const chunkOf = (
  assets: Assets,
  id: number,
): Option<ChunkMeta> =>
  fromNullable(assets.fts.chunks[id]);

const hitCard = (
  assets: Assets,
  id: number,
  score: number,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "hit",
        sx.border,
        sx.rounded("sm"),
        sx.p(2),
        sx.mb(1),
      ),
    ],
    pipe(
      chunkOf(assets, id),
      matchOption(
        (): ReadonlyArray<Flow<Msg>> => [
          text(`chunk #${id} (missing)`),
        ],
        (
          chunk: ChunkMeta,
        ): ReadonlyArray<Flow<Msg>> => [
          div(
            [
              sx.style_(
                "hit-path",
                sx.weight(600),
                sx.text("sm"),
              ),
            ],
            [text(chunk.headingPath)],
          ),
          p(
            [
              sx.style_(
                "hit-snippet",
                sx.text("sm"),
                sx.color("muted"),
                sx.mt(1),
                sx.mb(0),
              ),
            ],
            [
              text(
                chunk.text.length > 220
                  ? `${chunk.text.slice(0, 220)}…`
                  : chunk.text,
              ),
            ],
          ),
          div(
            [
              sx.style_(
                "hit-score",
                sx.text("sm"),
                sx.color("muted"),
                sx.mt(1),
              ),
            ],
            [text(`score ${score.toFixed(3)}`)],
          ),
        ],
      ),
    ),
  );

const emptyPane = (
  message: SoftStr,
): Html<Msg, "p"> =>
  p(
    [
      sx.style_(
        "pane-empty",
        sx.color("muted"),
        sx.text("sm"),
      ),
    ],
    [text(message)],
  );

const ftsPane = (
  model: Model,
  assets: Assets,
): Html<Msg, "section"> =>
  section(
    [sx.style_("pane", sx.grow)],
    [
      h2(
        [sx.style_("pane-title", sx.text("lg"))],
        [text("Full-text (BM25, from scratch)")],
      ),
      ...(model.q === ""
        ? [
            emptyPane(
              "Type a query to rank the guide's chunks.",
            ),
          ]
        : pipe(
            model.fts,
            matchOption(
              (): ReadonlyArray<Flow<Msg>> => [
                emptyPane("Searching…"),
              ],
              (
                outcome: FtsOutcome,
              ): ReadonlyArray<Flow<Msg>> => [
                p(
                  [
                    sx.style_(
                      "pane-timing",
                      sx.text("sm"),
                      sx.color("muted"),
                    ),
                  ],
                  [
                    text(
                      `ranked in ${ms(outcome.ms)}`,
                    ),
                  ],
                ),
                ...(outcome.hits.length === 0
                  ? [
                      emptyPane(
                        "No chunk matches — try different words (the tokenizer drops one-letter tokens).",
                      ),
                    ]
                  : outcome.hits.map((hit) =>
                      hitCard(
                        assets,
                        hit.id,
                        hit.score,
                      ),
                    )),
              ],
            ),
          )),
    ],
  );

const modelStatus = (
  model: Model,
): Html<Msg, "p"> => {
  switch (model.model.kind) {
    case "idle":
      return p(
        [
          sx.style_(
            "model-idle",
            sx.text("sm"),
            sx.color("muted"),
          ),
        ],
        [
          text(
            "Model loads from the CDN on first search (~25 MB once, then cached).",
          ),
        ],
      );
    case "loading":
      return p(
        [
          sx.style_(
            "model-loading",
            sx.text("sm"),
            sx.color("muted"),
          ),
        ],
        [
          text(
            "Loading the embedding model from the CDN…",
          ),
        ],
      );
    case "ready":
      return p(
        [
          sx.style_(
            "model-ready",
            sx.text("sm"),
            sx.color("primary"),
          ),
        ],
        [
          text(
            `Model ready (loaded in ${ms(model.model.initMs)})`,
          ),
        ],
      );
    case "failed":
      return p(
        [
          sx.style_(
            "model-failed",
            sx.text("sm"),
            sx.color("danger"),
          ),
        ],
        [
          text(
            `Model failed to load: ${model.model.reason}. Search stays available through the full-text arm.`,
          ),
        ],
      );
  }
};

const ragPane = (
  model: Model,
  assets: Assets,
): Html<Msg, "section"> =>
  section(
    [sx.style_("pane", sx.grow)],
    [
      h2(
        [sx.style_("pane-title", sx.text("lg"))],
        [
          text(
            "Vector RAG (MiniLM cosine top-k)",
          ),
        ],
      ),
      modelStatus(model),
      ...(model.q === ""
        ? [
            emptyPane(
              "The same query will rank by embedding similarity here.",
            ),
          ]
        : pipe(
            model.rag,
            matchOption(
              (): ReadonlyArray<Flow<Msg>> => [
                emptyPane(
                  "Embedding the query…",
                ),
              ],
              (
                outcome: RagOutcome,
              ): ReadonlyArray<Flow<Msg>> =>
                outcome.kind === "unavailable"
                  ? [
                      p(
                        [
                          sx.style_(
                            "pane-unavailable",
                            sx.color("danger"),
                            sx.text("sm"),
                          ),
                        ],
                        [
                          text(
                            `This arm is unavailable: ${outcome.reason}`,
                          ),
                        ],
                      ),
                    ]
                  : [
                      p(
                        [
                          sx.style_(
                            "pane-timing",
                            sx.text("sm"),
                            sx.color("muted"),
                          ),
                        ],
                        [
                          text(
                            `embedded in ${ms(outcome.embedMs)}, ranked in ${ms(outcome.rankMs)}`,
                          ),
                        ],
                      ),
                      ...(outcome.hits.length ===
                      0
                        ? [
                            emptyPane(
                              "No ranked chunks.",
                            ),
                          ]
                        : outcome.hits.map(
                            (hit) =>
                              hitCard(
                                assets,
                                hit.id,
                                hit.score,
                              ),
                          )),
                    ],
            ),
          )),
    ],
  );

const metricsSection = (
  assets: Assets,
): Html<Msg, "section"> => {
  const cell = (
    content: SoftStr,
  ): Html<Msg, "td"> =>
    td(
      [
        sx.style_(
          "m-cell",
          sx.p(1),
          sx.border,
        ),
      ],
      [text(content)],
    );
  const head = (
    content: SoftStr,
  ): Html<Msg, "th"> =>
    th(
      [
        sx.style_(
          "m-head",
          sx.p(1),
          sx.border,
          sx.left,
        ),
      ],
      [text(content)],
    );
  const embeddings = assets.metrics.embeddings;
  return section(
    [sx.style_("metrics", sx.mt(4))],
    [
      h2(
        [sx.style_("m-title", sx.text("lg"))],
        [text("Measured build facts")],
      ),
      p(
        [
          sx.style_(
            "m-corpus",
            sx.text("sm"),
            sx.color("muted"),
          ),
        ],
        [
          text(
            `Corpus: ${assets.metrics.corpus.files} guide files, ${assets.metrics.corpus.chunks} chunks, ${kb(assets.metrics.corpus.bytes)} of Markdown.`,
          ),
        ],
      ),
      table(
        [sx.style_("m-table", sx.mt(1))],
        [
          thead(
            [],
            [
              tr(
                [],
                [
                  head("Arm"),
                  head("Index payload"),
                  head("Index build time"),
                ],
              ),
            ],
          ),
          tbody(
            [],
            [
              tr(
                [],
                [
                  cell("Full-text (BM25)"),
                  cell(
                    kb(assets.metrics.fts.bytes),
                  ),
                  cell(
                    `${assets.metrics.fts.buildMs} ms`,
                  ),
                ],
              ),
              tr(
                [],
                "absent" in embeddings
                  ? [
                      cell("Vector (MiniLM)"),
                      cell("not built"),
                      cell(embeddings.absent),
                    ]
                  : [
                      cell(
                        `Vector (${embeddings.model}, ${embeddings.dims}d)`,
                      ),
                      cell(
                        kb(embeddings.bytes),
                      ),
                      cell(
                        `${embeddings.buildMs} ms`,
                      ),
                    ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
};

const statsLine = (
  label: SoftStr,
  stats: LatencyStats,
): Html<Msg, "p"> =>
  p(
    [sx.style_("b-stats", sx.text("sm"))],
    [
      text(
        `${label}: p50 ${ms(stats.p50)} · p95 ${ms(stats.p95)}`,
      ),
    ],
  );

const benchRow = (
  assets: Assets,
  row: BenchRow,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "b-row",
        sx.border,
        sx.rounded("sm"),
        sx.p(2),
        sx.mb(2),
      ),
    ],
    [
      h3(
        [sx.style_("b-q", sx.text("base"))],
        [text(`“${row.query}”`)],
      ),
      div(
        [
          sx.style_(
            "b-cols",
            sx.flex,
            sx.gap(3),
            sx.wrap,
          ),
        ],
        [
          div(
            [sx.style_("b-col", sx.grow)],
            [
              p(
                [
                  sx.style_(
                    "b-col-title",
                    sx.weight(600),
                    sx.text("sm"),
                  ),
                ],
                [
                  text(
                    `FTS (${ms(row.fts.ms)})`,
                  ),
                ],
              ),
              ...row.fts.hits.map((hit) =>
                hitCard(
                  assets,
                  hit.id,
                  hit.score,
                ),
              ),
            ],
          ),
          div(
            [sx.style_("b-col", sx.grow)],
            row.rag.kind === "unavailable"
              ? [
                  p(
                    [
                      sx.style_(
                        "b-col-title",
                        sx.weight(600),
                        sx.text("sm"),
                      ),
                    ],
                    [
                      text(
                        `RAG unavailable: ${row.rag.reason}`,
                      ),
                    ],
                  ),
                ]
              : [
                  p(
                    [
                      sx.style_(
                        "b-col-title",
                        sx.weight(600),
                        sx.text("sm"),
                      ),
                    ],
                    [
                      text(
                        `RAG (embed ${ms(row.rag.embedMs)} + rank ${ms(row.rag.rankMs)})`,
                      ),
                    ],
                  ),
                  ...row.rag.hits.map((hit) =>
                    hitCard(
                      assets,
                      hit.id,
                      hit.score,
                    ),
                  ),
                ],
          ),
        ],
      ),
    ],
  );

const benchBody = (
  model: Model,
  assets: Assets,
): ReadonlyArray<Flow<Msg>> =>
  (model.bench.kind === "idle"
        ? [
            button(
              [
                type_("button"),
                onClick<Msg>({
                  kind: "BenchRequested",
                }),
                sx.style_(
                  "b-run",
                  sx.bg("primary"),
                  sx.color("primary-text"),
                  sx.rounded("sm"),
                  sx.px(3),
                  sx.py(1),
                  sx.pointer,
                ),
              ],
              [text("Run benchmark")],
            ),
          ]
        : model.bench.kind === "running"
          ? [
              p(
                [
                  sx.style_(
                    "b-running",
                    sx.color("muted"),
                  ),
                ],
                [
                  text(
                    "Running both arms over the canned set… (first run includes the model load)",
                  ),
                ],
              ),
            ]
          : [
              statsLine(
                "FTS query latency",
                model.bench.fts,
              ),
              ...pipe(
                model.bench.rag,
                matchOption(
                  (): ReadonlyArray<
                    Flow<Msg>
                  > => [
                    p(
                      [
                        sx.style_(
                          "b-no-rag",
                          sx.text("sm"),
                          sx.color("danger"),
                        ),
                      ],
                      [
                        text(
                          "RAG latency: unavailable (no embeddings / model failed)",
                        ),
                      ],
                    ),
                  ],
                  (
                    stats: LatencyStats,
                  ): ReadonlyArray<Flow<Msg>> => [
                    statsLine(
                      "RAG query latency (embed + rank)",
                      stats,
                    ),
                  ],
                ),
              ),
              ...model.bench.rows.map((row) =>
                benchRow(assets, row),
              ),
            ]);

const benchSection = (
  model: Model,
  assets: Assets,
): Html<Msg, "section"> =>
  section(
    [sx.style_("bench", sx.mt(4))],
    [
      h2(
        [sx.style_("b-title", sx.text("lg"))],
        [
          text(
            "Canned-query benchmark (10 guide questions)",
          ),
        ],
      ),
      ...benchBody(model, assets),
    ],
  );

export const view = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "poc1",
        sx.maxW(240),
        sx.mx(4),
        sx.my(4),
        sx.color("text"),
      ),
    ],
    [
      header(
        [sx.style_("p-header", sx.mb(3))],
        [
          h1(
            [
              sx.style_(
                "p-title",
                sx.text("2xl"),
              ),
            ],
            [
              text(
                "PoC 1 — browser search core",
              ),
            ],
          ),
          p(
            [
              sx.style_(
                "p-intro",
                sx.color("muted"),
              ),
            ],
            [
              text(
                "Indexed full-text search vs vector RAG, both fully in the browser, on the real plgg guide corpus. ",
              ),
              a(
                [
                  href("https://plgg-poc.qmu.dev/"),
                  sx.style_(
                    "p-portal-link",
                    sx.color("primary"),
                  ),
                ],
                [text("Back to the PoC portal")],
              ),
            ],
          ),
        ],
      ),
      ...(model.assets.kind === "loading"
        ? [
            p(
              [
                sx.style_(
                  "p-loading",
                  sx.color("muted"),
                ),
              ],
              [
                text(
                  "Loading the shipped index assets…",
                ),
              ],
            ),
          ]
        : model.assets.kind === "failed"
          ? [
              p(
                [
                  sx.style_(
                    "p-failed",
                    sx.color("danger"),
                  ),
                ],
                [
                  text(
                    `Index assets failed to load: ${model.assets.reason}`,
                  ),
                ],
              ),
            ]
          : viewReady(
              model,
              model.assets.assets,
            )),
    ],
  );

const viewReady = (
  model: Model,
  assets: Assets,
): ReadonlyArray<Flow<Msg>> => [
  form(
    [
      onSubmit<Msg>({ kind: "Submitted" }),
      sx.style_(
        "p-form",
        sx.flex,
        sx.gap(2),
        sx.mb(3),
      ),
    ],
    [
      input([
        type_("search"),
        value_(model.draft),
        attr(
          "placeholder",
          "Ask the guide… (e.g. option instead of null)",
        ),
        attr("aria-label", "Search query"),
        onInput(
          (value): Msg => ({
            kind: "DraftChanged",
            value,
          }),
        ),
        sx.style_(
          "p-input",
          sx.grow,
          sx.border,
          sx.rounded("sm"),
          sx.px(2),
          sx.py(1),
        ),
      ], []),
      button(
        [
          type_("submit"),
          sx.style_(
            "p-submit",
            sx.bg("primary"),
            sx.color("primary-text"),
            sx.rounded("sm"),
            sx.px(3),
            sx.pointer,
          ),
        ],
        [text("Search")],
      ),
    ],
  ),
  div(
    [
      sx.style_(
        "p-panes",
        sx.flex,
        sx.gap(4),
        sx.wrap,
      ),
    ],
    [
      ftsPane(model, assets),
      ragPane(model, assets),
    ],
  ),
  metricsSection(assets),
  benchSection(model, assets),
];
