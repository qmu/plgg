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
import type {
  ChunkMeta,
  FtsIndex,
} from "./indexer/buildFts.ts";
import type { CjkStrategy } from "./search/tokenize.ts";
import type {
  JaReport,
  JaHit,
  JaQueryRow,
} from "./jaReport.ts";
import type {
  Model,
  Msg,
  Assets,
  FtsOutcome,
  RagOutcome,
  BenchRow,
  LatencyStats,
} from "./app.ts";

/** The three tokenizer arms, in display order. */
const JA_STRATEGIES: ReadonlyArray<CjkStrategy> =
  ["none", "segmenter", "bigram"];

const JA_STRATEGY_LABEL: Readonly<
  Record<CjkStrategy, SoftStr>
> = {
  none: "Current (latin [a-z0-9]+)",
  segmenter: "Intl.Segmenter (word)",
  bigram: "Bigram (2-gram)",
};

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
    [
      sx.style_(
        "pane",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface-2"),
        sx.p(3),
      ),
    ],
    [
      h2(
        [
          sx.style_(
            "pane-title",
            sx.text("base"),
            sx.weight(700),
            sx.mt(0),
            sx.mb(2),
          ),
        ],
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
    [
      sx.style_(
        "pane",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface-2"),
        sx.p(3),
      ),
    ],
    [
      h2(
        [
          sx.style_(
            "pane-title",
            sx.text("base"),
            sx.weight(700),
            sx.mt(0),
            sx.mb(2),
          ),
        ],
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

const metricsTable = (
  assets: Assets,
): Html<Msg, "table"> => {
  const cell = (
    content: SoftStr,
  ): Html<Msg, "td"> =>
    td(
      [
        sx.style_(
          "m-cell",
          sx.p(2),
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
          sx.p(2),
          sx.border,
          sx.bg("surface-2"),
          sx.left,
        ),
      ],
      [text(content)],
    );
  const embeddings = assets.metrics.embeddings;
  return table(
    [sx.style_("m-table", sx.wFull)],
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
                  cell(kb(embeddings.bytes)),
                  cell(
                    `${embeddings.buildMs} ms`,
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

/* ------------------------------------------------ *
 * Japanese CJK-tokenizer comparison (Ticket B)      *
 * ------------------------------------------------ */

const jaArmsTable = (
  report: JaReport,
): Html<Msg, "table"> => {
  const cell = (
    content: SoftStr,
  ): Html<Msg, "td"> =>
    td(
      [
        sx.style_(
          "ja-cell",
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
          "ja-head",
          sx.p(1),
          sx.border,
          sx.left,
        ),
      ],
      [text(content)],
    );
  return table(
    [sx.style_("ja-table", sx.mt(1))],
    [
      thead(
        [],
        [
          tr(
            [],
            [
              head("Tokenizer"),
              head("Indexed tokens"),
              head("Distinct terms"),
              head("Index payload"),
              head("Build"),
            ],
          ),
        ],
      ),
      tbody(
        [],
        report.arms.map((arm) =>
          tr(
            [],
            [
              cell(
                JA_STRATEGY_LABEL[arm.strategy],
              ),
              cell(`${arm.tokens}`),
              cell(`${arm.vocab}`),
              cell(kb(arm.ftsBytes)),
              cell(`${arm.buildMs} ms`),
            ],
          ),
        ),
      ),
    ],
  );
};

const jaHitList = (
  hits: ReadonlyArray<JaHit>,
): ReadonlyArray<Flow<Msg>> =>
  hits.length === 0
    ? [
        p(
          [
            sx.style_(
              "ja-empty",
              sx.text("sm"),
              sx.color("muted"),
            ),
          ],
          [text("— no hits —")],
        ),
      ]
    : hits.map((hit) =>
        p(
          [sx.style_("ja-hit", sx.text("sm"))],
          [text(hit.headingPath)],
        ),
      );

const jaQueryBlock = (
  row: JaQueryRow,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "ja-row",
        sx.border,
        sx.rounded("sm"),
        sx.p(2),
        sx.mb(2),
      ),
    ],
    [
      h3(
        [sx.style_("ja-q", sx.text("base"))],
        [text(`“${row.query}”`)],
      ),
      div(
        [
          sx.style_(
            "ja-cols",
            sx.flex,
            sx.gap(3),
            sx.wrap,
          ),
        ],
        JA_STRATEGIES.map((strategy) =>
          div(
            [sx.style_("ja-col", sx.grow)],
            [
              p(
                [
                  sx.style_(
                    "ja-col-title",
                    sx.weight(600),
                    sx.text("sm"),
                  ),
                ],
                [
                  text(
                    JA_STRATEGY_LABEL[strategy],
                  ),
                ],
              ),
              ...jaHitList(row.hits[strategy]),
            ],
          ),
        ),
      ),
    ],
  );

// A live JA search hit, rendered from the segmenter
// index's OWN chunks (ids index that index, not the guide
// index the English box uses).
const jaHitCard = (
  index: FtsIndex,
  id: number,
  score: number,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "ja-hit-card",
        sx.border,
        sx.rounded("sm"),
        sx.p(2),
        sx.mb(1),
      ),
    ],
    pipe(
      fromNullable(index.chunks[id]),
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
                "ja-hit-path",
                sx.weight(600),
                sx.text("sm"),
              ),
            ],
            [text(chunk.headingPath)],
          ),
          p(
            [
              sx.style_(
                "ja-hit-snippet",
                sx.text("sm"),
                sx.color("muted"),
                sx.mt(1),
                sx.mb(0),
              ),
            ],
            [
              text(
                chunk.text.length > 160
                  ? `${chunk.text.slice(0, 160)}…`
                  : chunk.text,
              ),
            ],
          ),
          div(
            [
              sx.style_(
                "ja-hit-score",
                sx.text("sm"),
                sx.color("muted"),
                sx.mt(1),
              ),
            ],
            [
              text(
                `score ${score.toFixed(3)}`,
              ),
            ],
          ),
        ],
      ),
    ),
  );

// The dedicated Japanese search box + its live results,
// ranking over the shipped segmenter index. The English
// box above is guide-only; this one makes Japanese
// queries return real hits.
const jaSearchBlock = (
  model: Model,
  index: FtsIndex,
): ReadonlyArray<Flow<Msg>> => [
  form(
    [
      onSubmit<Msg>({ kind: "JaSubmitted" }),
      sx.style_(
        "ja-form",
        sx.flex,
        sx.gap(2),
        sx.mt(2),
        sx.mb(2),
      ),
    ],
    [
      input(
        [
          type_("search"),
          value_(model.jaDraft),
          attr(
            "placeholder",
            "日本語で検索…（例：型駆動設計 / 情報セキュリティ）",
          ),
          attr(
            "aria-label",
            "Japanese search query",
          ),
          onInput(
            (value): Msg => ({
              kind: "JaDraftChanged",
              value,
            }),
          ),
          sx.style_(
            "ja-search-input",
            sx.grow,
            sx.border,
            sx.rounded("sm"),
            sx.px(2),
            sx.py(1),
          ),
        ],
        [],
      ),
      button(
        [
          type_("submit"),
          sx.style_(
            "ja-search-submit",
            sx.bg("primary"),
            sx.color("primary-text"),
            sx.rounded("sm"),
            sx.px(3),
            sx.pointer,
          ),
        ],
        [text("検索")],
      ),
    ],
  ),
  ...pipe(
    model.jaResult,
    matchOption(
      (): ReadonlyArray<Flow<Msg>> => [
        emptyPane(
          "日本語のクエリを入力すると、Intl.Segmenter 索引でランキングします。",
        ),
      ],
      (
        outcome: FtsOutcome,
      ): ReadonlyArray<Flow<Msg>> =>
        outcome.hits.length === 0
          ? [
              emptyPane(
                "ヒットなし。別の語で試してください。",
              ),
            ]
          : [
              p(
                [
                  sx.style_(
                    "ja-res-note",
                    sx.text("sm"),
                    sx.color("muted"),
                  ),
                ],
                [
                  text(
                    `${outcome.hits.length} hits · ${ms(outcome.ms)}`,
                  ),
                ],
              ),
              ...outcome.hits.map((hit) =>
                jaHitCard(
                  index,
                  hit.id,
                  hit.score,
                ),
              ),
            ],
    ),
  ),
];

// The Japanese sub-heading: a labelled divider so the
// live search, the cost table, and the canned comparison
// read as three steps inside one panel.
const jaSubhead = (
  label: SoftStr,
): Html<Msg, "h3"> =>
  h3(
    [
      sx.style_(
        "ja-subhead",
        sx.text("base"),
        sx.weight(700),
        sx.mt(5),
        sx.pt(3),
        sx.decl(
          "border-top",
          "1px solid #e6dcc8",
        ),
      ),
    ],
    [text(label)],
  );

const jaPanel = (
  model: Model,
  assets: Assets,
): ReadonlyArray<Flow<Msg>> =>
  pipe(
    assets.ja,
    matchOption(
      (): ReadonlyArray<Flow<Msg>> => [],
      (
        report: JaReport,
      ): ReadonlyArray<Flow<Msg>> => [
        panel(
          "日本語 · CJK",
          "Japanese (CJK) search",
          `The guide box above is English-only. This box searches ${report.corpus.files} real qmu.co.jp policy files (${report.corpus.chunks} chunks) via the Intl.Segmenter index — the from-scratch latin-only tokenizer indexes Japanese to zero, and the comparison below measures the fix.`,
          [
            ...pipe(
              assets.jaFts,
              matchOption(
                (): ReadonlyArray<
                  Flow<Msg>
                > => [],
                (
                  index: FtsIndex,
                ): ReadonlyArray<Flow<Msg>> =>
                  jaSearchBlock(model, index),
              ),
            ),
            jaSubhead(
              "Index cost per tokenizer",
            ),
            jaArmsTable(report),
            jaSubhead(
              "Canned queries — top hits per tokenizer",
            ),
            ...report.queries.map(jaQueryBlock),
          ],
        ),
      ],
    ),
  );

// A small uppercase, letter-spaced accent label — the
// thread that ties each panel back to the PoC identity.
const eyebrow = (
  label: SoftStr,
): Html<Msg, "p"> =>
  p(
    [
      sx.style_(
        "eyebrow",
        sx.text("sm"),
        sx.weight(700),
        sx.color("primary"),
        sx.mb(0),
        sx.decl("letter-spacing", "0.09em"),
        sx.decl(
          "text-transform",
          "uppercase",
        ),
      ),
    ],
    [text(label)],
  );

// The one grouping primitive: every functional area is a
// bordered card that names itself (eyebrow + title) and
// says what you can do with it (description), so the
// page's boundaries are never ambiguous.
const panel = (
  eyebrowText: SoftStr,
  title: SoftStr,
  desc: SoftStr,
  body: ReadonlyArray<Flow<Msg>>,
): Html<Msg, "section"> =>
  section(
    [
      sx.style_(
        "panel",
        sx.bg("surface"),
        sx.border,
        sx.rounded("lg"),
        sx.shadow("sm"),
        sx.p(5),
        sx.mb(5),
      ),
    ],
    [
      div(
        [sx.style_("panel-head", sx.mb(4))],
        [
          eyebrow(eyebrowText),
          h2(
            [
              sx.style_(
                "panel-title",
                sx.text("xl"),
                sx.weight(700),
                sx.mt(1),
                sx.mb(1),
              ),
            ],
            [text(title)],
          ),
          p(
            [
              sx.style_(
                "panel-desc",
                sx.text("sm"),
                sx.color("muted"),
                sx.mb(0),
              ),
            ],
            [text(desc)],
          ),
        ],
      ),
      ...body,
    ],
  );

const hero: Html<Msg, "header"> = header(
  [sx.style_("hero", sx.mb(5))],
  [
    div(
      [
        sx.style_(
          "hero-top",
          sx.flex,
          sx.items("center"),
          sx.justify("between"),
          sx.wrap,
          sx.gap(3),
          sx.mb(3),
        ),
      ],
      [
        eyebrow("plggpress PoC fleet · No. 1"),
        a(
          [
            href("https://plgg-poc.qmu.dev/"),
            sx.style_(
              "hero-back",
              sx.text("sm"),
              sx.color("primary"),
              sx.border,
              sx.rounded("full"),
              sx.px(3),
              sx.py(1),
            ),
          ],
          [text("← All PoCs")],
        ),
      ],
    ),
    h1(
      [
        sx.style_(
          "hero-title",
          sx.text("2xl"),
          sx.weight(700),
          sx.mb(2),
        ),
      ],
      [text("Browser Search Core")],
    ),
    p(
      [
        sx.style_(
          "hero-sub",
          sx.color("muted"),
          sx.text("lg"),
          sx.mb(0),
        ),
      ],
      [
        text(
          "Two ways to search — a from-scratch full-text index and vector embeddings — measured side by side, entirely in the browser, on the real docs. No server, no backend search.",
        ),
      ],
    ),
  ],
);

export const view = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "poc1",
        sx.bg("surface-2"),
        sx.color("text"),
        sx.decl("min-height", "100vh"),
        sx.py(7),
        sx.px(4),
      ),
    ],
    [
      div(
        [
          sx.style_(
            "poc1-col",
            sx.maxW(220),
            sx.decl("margin", "0 auto"),
          ),
        ],
        [
          hero,
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
      ),
    ],
  );

const searchArea = (
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
        sx.mb(4),
      ),
    ],
    [
      input(
        [
          type_("search"),
          value_(model.draft),
          attr(
            "placeholder",
            "Ask the guide… (e.g. option instead of null)",
          ),
          attr(
            "aria-label",
            "Search query",
          ),
          onInput(
            (value): Msg => ({
              kind: "DraftChanged",
              value,
            }),
          ),
          sx.style_(
            "p-input",
            sx.grow,
            sx.bg("surface"),
            sx.border,
            sx.rounded("md"),
            sx.px(3),
            sx.py(2),
          ),
        ],
        [],
      ),
      button(
        [
          type_("submit"),
          sx.style_(
            "p-submit",
            sx.bg("primary"),
            sx.color("primary-text"),
            sx.rounded("md"),
            sx.px(4),
            sx.py(2),
            sx.weight(600),
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
        sx.grid,
        sx.gap(4),
        sx.decl(
          "grid-template-columns",
          "repeat(auto-fit, minmax(16rem, 1fr))",
        ),
      ),
    ],
    [
      ftsPane(model, assets),
      ragPane(model, assets),
    ],
  ),
];

const viewReady = (
  model: Model,
  assets: Assets,
): ReadonlyArray<Flow<Msg>> => [
  panel(
    "Try it",
    "Search the guide — English",
    "Type a question; both engines rank the plgg guide live, side by side. Full-text is instant and tiny; the vector arm loads a model on first use.",
    searchArea(model, assets),
  ),
  panel(
    "Speed",
    "Latency benchmark",
    "Run all ten canned guide questions through both engines and compare p50 / p95 query latency.",
    benchBody(model, assets),
  ),
  panel(
    "Cost",
    "Measured build facts",
    `What each index costs to ship — the guide corpus is ${assets.metrics.corpus.files} files, ${assets.metrics.corpus.chunks} chunks, ${kb(assets.metrics.corpus.bytes)}.`,
    [metricsTable(assets)],
  ),
  ...jaPanel(model, assets),
];
