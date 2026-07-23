/**
 * PoC 6's page: the non-tree navigation shell. A typed
 * QUERY box (the deterministic, model-free path), example
 * query buttons, and — the heart — the THREE variant panes
 * rendered SIDE BY SIDE over one corpus, each showing its
 * own current query and result set so they can be compared:
 * tag facets, the link/backlink graph, and the
 * multi-dimensional filter. The Realtime voice session is a
 * bonus panel. Clicking a tag runs a facet query; clicking
 * any result page focuses the link graph on it.
 *
 * All states are designed (loading / failed / no-query /
 * empty-result / results — self-explanatory-ui policy).
 */
import {
  type SoftStr,
  type Option,
  isSome,
} from "plgg";
import {
  type Html,
  type Flow,
  div,
  section,
  header,
  h1,
  h2,
  p,
  a,
  form,
  input,
  button,
  text,
  attr,
  href,
  type_,
  value_,
  placeholder_,
  onClick,
  onInput,
  onSubmit,
} from "plgg-view";
import * as sx from "plgg-view/style";
import type { Model, Msg, Ready } from "./app.ts";
import {
  type Page,
  allTags,
  tagCount,
} from "./classify.ts";
import {
  type Variant,
  type VariantQuery,
  runQuery,
  variantLabel,
  variantBlurb,
} from "./variants.ts";
import type { Line, QueryTrail } from "./agent.ts";

const RESULT_CAP = 60;

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
        sx.decl("text-transform", "uppercase"),
      ),
    ],
    [text(label)],
  );

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

const notice = (
  name: SoftStr,
  tone: "muted" | "danger",
  message: SoftStr,
): Html<Msg, "p"> =>
  p(
    [
      sx.style_(
        name,
        sx.color(tone),
        sx.text("sm"),
      ),
    ],
    [text(message)],
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
        eyebrow("plggpress PoC fleet · No. 6"),
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
      [
        text(
          "Non-tree classification — three ways to navigate one corpus",
        ),
      ],
    ),
    p(
      [
        sx.style_(
          "hero-sub",
          sx.color("muted"),
          sx.text("lg"),
          sx.mb(2),
        ),
      ],
      [
        text(
          "The filesystem is a tree, but knowledge is multi-dimensional. Each page carries several tags (its directory segments plus front matter) and links to others. Type a query — or ask the assistant by voice — and the three navigation variants below re-render side by side, so they can be compared over one corpus.",
        ),
      ],
    ),
    p(
      [
        sx.style_(
          "hero-sovereignty",
          sx.color("muted"),
          sx.text("sm"),
          sx.mb(0),
        ),
      ],
      [
        text(
          "Honest note: the typed query path is fully deterministic and needs no model. The optional voice path streams to OpenAI's Realtime API under a SHORT-LIVED key the server mints; the standing key never reaches the browser. The corpus is a git-ignored copy of the guide.",
        ),
      ],
    ),
  ],
);

/* ------------------------------------------------ *
 * Query command box                                 *
 * ------------------------------------------------ */

const commandBox = (
  model: Model,
): Html<Msg, "form"> =>
  form(
    [
      onSubmit<Msg>({ kind: "QuerySubmitted" }),
      sx.style_(
        "command",
        sx.flex,
        sx.items("center"),
        sx.gap(2),
        sx.mt(2),
        sx.mb(2),
      ),
    ],
    [
      input(
        [
          type_("text"),
          value_(model.draft),
          onInput((value): Msg => ({
            kind: "DraftEdited",
            value,
          })),
          placeholder_(
            "e.g. facets and concepts  ·  links concepts/index.md  ·  filter option #concepts",
          ),
          attr("aria-label", "Query command"),
          sx.style_(
            "command-input",
            sx.bg("surface"),
            sx.border,
            sx.rounded("md"),
            sx.px(3),
            sx.py(2),
            sx.decl("flex", "1 1 auto"),
            sx.decl("min-width", "0"),
            sx.decl(
              "font-family",
              "ui-monospace, SFMono-Regular, Menlo, monospace",
            ),
          ),
        ],
        [],
      ),
      button(
        [
          type_("submit"),
          ...(model.draft.trim() === ""
            ? [attr("disabled", "")]
            : []),
          sx.style_(
            "command-run",
            sx.bg("primary"),
            sx.color("primary-text"),
            sx.rounded("md"),
            sx.px(4),
            sx.py(2),
            sx.weight(600),
            sx.pointer,
          ),
        ],
        [text("Run")],
      ),
    ],
  );

const commandHint: Html<Msg, "p"> = p(
  [
    sx.style_(
      "command-hint",
      sx.text("sm"),
      sx.color("muted"),
      sx.mb(0),
      sx.decl(
        "font-family",
        "ui-monospace, SFMono-Regular, Menlo, monospace",
      ),
    ),
  ],
  [
    text(
      "facets <and|or> [tag …] · links <page path> · filter <text | #tag …>  ·  or click a tag / a result page below",
    ),
  ],
);

/* ------------------------------------------------ *
 * Clickable atoms                                   *
 * ------------------------------------------------ */

const tagChip = (
  tag: SoftStr,
  count: number,
): Html<Msg, "button"> =>
  button(
    [
      type_("button"),
      onClick<Msg>({
        kind: "QueryRequested",
        query: {
          kind: "tag-facets",
          query: { tags: [tag], mode: "or" },
        },
      }),
      sx.style_(
        "tag-chip",
        sx.rounded("full"),
        sx.border,
        sx.bg("surface-2"),
        sx.px(2),
        sx.py(1),
        sx.text("sm"),
        sx.weight(600),
        sx.pointer,
        sx.decl("white-space", "nowrap"),
      ),
    ],
    [text(`${tag} · ${count}`)],
  );

const pageItem = (
  page: Page,
): Html<Msg, "button"> =>
  button(
    [
      type_("button"),
      onClick<Msg>({
        kind: "QueryRequested",
        query: {
          kind: "link-graph",
          query: { focus: page.path },
        },
      }),
      attr(
        "title",
        `tags: ${page.tags.join(", ")} · links: ${page.links.length}`,
      ),
      sx.style_(
        "page-item",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface"),
        sx.px(2),
        sx.py(1),
        sx.mb(1),
        sx.text("sm"),
        sx.pointer,
        sx.decl("display", "block"),
        sx.decl("width", "100%"),
        sx.decl("text-align", "left"),
        sx.decl(
          "font-family",
          "ui-monospace, SFMono-Regular, Menlo, monospace",
        ),
      ),
    ],
    [text(page.path)],
  );

const resultList = (
  pages: ReadonlyArray<Page>,
): ReadonlyArray<Flow<Msg>> =>
  pages.length === 0
    ? [
        notice(
          "pane-empty",
          "muted",
          "No pages match.",
        ),
      ]
    : [
        p(
          [
            sx.style_(
              "pane-count",
              sx.text("sm"),
              sx.color("muted"),
              sx.mb(1),
            ),
          ],
          [
            text(
              `${pages.length} page${pages.length === 1 ? "" : "s"}${
                pages.length > RESULT_CAP
                  ? ` (showing ${RESULT_CAP})`
                  : ""
              }`,
            ),
          ],
        ),
        ...pages
          .slice(0, RESULT_CAP)
          .map(pageItem),
      ];

/* ------------------------------------------------ *
 * The three comparable variant panes                *
 * ------------------------------------------------ */

const querySummaryLine = (
  slot: Option<VariantQuery>,
): Html<Msg, "p"> =>
  p(
    [
      sx.style_(
        "pane-query",
        sx.text("sm"),
        sx.color("muted"),
        sx.mb(2),
        sx.decl(
          "font-family",
          "ui-monospace, SFMono-Regular, Menlo, monospace",
        ),
      ),
    ],
    [
      text(
        isSome(slot)
          ? summarizeSlot(slot.content)
          : "no query yet",
      ),
    ],
  );

const summarizeSlot = (
  vq: VariantQuery,
): SoftStr => {
  switch (vq.kind) {
    case "tag-facets":
      return `${vq.query.mode.toUpperCase()} [ ${vq.query.tags.join(", ") || "all"} ]`;
    case "link-graph":
      return `focus: ${vq.query.focus}`;
    case "multi-filter":
      return `text "${vq.query.text}" + tags [ ${vq.query.tags.join(", ") || "any"} ]`;
  }
};

const paneBody = (
  model: Model,
  ready: Ready,
  variant: Variant,
): ReadonlyArray<Flow<Msg>> => {
  const slot =
    variant === "tag-facets"
      ? model.queries.tagFacets
      : variant === "link-graph"
        ? model.queries.linkGraph
        : model.queries.multiFilter;
  const results = isSome(slot)
    ? runQuery(ready.pages, slot.content)
    : [];
  return [
    querySummaryLine(slot),
    ...(variant === "tag-facets"
      ? [tagCloud(ready)]
      : []),
    ...(isSome(slot)
      ? resultList(results)
      : [
          notice(
            "pane-noquery",
            "muted",
            variant === "link-graph"
              ? "Click a result page in any pane to focus its links here, or type `links <path>`."
              : "Run a query above, or click a tag.",
          ),
        ]),
  ];
};

const tagCloud = (
  ready: Ready,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "tag-cloud",
        sx.flex,
        sx.wrap,
        sx.gap(1),
        sx.mb(2),
      ),
    ],
    allTags(ready.pages).map((tag) =>
      tagChip(tag, tagCount(ready.pages, tag)),
    ),
  );

const variantPane = (
  model: Model,
  ready: Ready,
  variant: Variant,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        `pane-${variant}`,
        sx.border,
        sx.rounded("md"),
        sx.bg("surface-2"),
        sx.p(3),
        sx.decl("min-width", "0"),
        sx.decl("max-height", "32rem"),
        sx.decl("overflow", "auto"),
      ),
    ],
    [
      p(
        [
          sx.style_(
            "pane-title",
            sx.weight(700),
            sx.mb(1),
          ),
        ],
        [text(variantLabel(variant))],
      ),
      p(
        [
          sx.style_(
            "pane-blurb",
            sx.text("sm"),
            sx.color("muted"),
            sx.mb(2),
          ),
        ],
        [text(variantBlurb(variant))],
      ),
      ...paneBody(model, ready, variant),
    ],
  );

const variantsGrid = (
  model: Model,
  ready: Ready,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "variants-grid",
        sx.decl("display", "grid"),
        sx.decl(
          "grid-template-columns",
          "repeat(auto-fit, minmax(15rem, 1fr))",
        ),
        sx.decl("gap", "12px"),
      ),
    ],
    [
      variantPane(model, ready, "tag-facets"),
      variantPane(model, ready, "link-graph"),
      variantPane(model, ready, "multi-filter"),
    ],
  );

/* ------------------------------------------------ *
 * Session (voice bonus) + trails                    *
 * ------------------------------------------------ */

const sessionStatus = (
  model: Model,
): Html<Msg, "p"> => {
  switch (model.session.kind) {
    case "idle":
      return notice(
        "session-idle",
        "muted",
        "No voice session — press Start and allow the microphone (optional; the query box needs no session).",
      );
    case "starting":
      return notice(
        "session-starting",
        "muted",
        "Starting… (minting a short-lived key, opening WebRTC)",
      );
    case "live":
      return notice(
        "session-live",
        "muted",
        "Session live — ask the assistant to find pages; it calls the same query tools.",
      );
    case "failed":
      return notice(
        "session-failed",
        "danger",
        model.session.reason,
      );
  }
};

const sessionControls = (
  model: Model,
): Html<Msg, "div"> => {
  const busy =
    model.session.kind === "starting" ||
    model.session.kind === "live";
  return div(
    [
      sx.style_(
        "session-controls",
        sx.flex,
        sx.items("center"),
        sx.gap(3),
        sx.mb(2),
      ),
    ],
    [
      button(
        [
          type_("button"),
          onClick<Msg>({
            kind: "StartRequested",
          }),
          ...(busy ? [attr("disabled", "")] : []),
          sx.style_(
            "session-start",
            sx.bg("primary"),
            sx.color("primary-text"),
            sx.rounded("md"),
            sx.px(4),
            sx.py(2),
            sx.weight(600),
            sx.pointer,
          ),
        ],
        [
          text(
            model.session.kind === "live"
              ? "Live"
              : "Start voice session",
          ),
        ],
      ),
      button(
        [
          type_("button"),
          onClick<Msg>({
            kind: "StopRequested",
          }),
          ...(busy ? [] : [attr("disabled", "")]),
          sx.style_(
            "session-stop",
            sx.bg("surface-2"),
            sx.border,
            sx.rounded("md"),
            sx.px(4),
            sx.py(2),
            sx.weight(600),
            sx.pointer,
          ),
        ],
        [text("Stop")],
      ),
    ],
  );
};

const trailCard = (
  entry: QueryTrail,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        entry.outcome.kind === "ran"
          ? "trail-ran"
          : "trail-refused",
        sx.border,
        sx.rounded("md"),
        sx.p(2),
        sx.mb(1),
      ),
    ],
    [
      div(
        [
          sx.style_(
            "trail-summary",
            sx.weight(600),
            sx.text("sm"),
            sx.decl(
              "font-family",
              "ui-monospace, SFMono-Regular, Menlo, monospace",
            ),
          ),
        ],
        [text(entry.summary)],
      ),
      entry.outcome.kind === "ran"
        ? notice(
            "trail-ok",
            "muted",
            `${entry.outcome.count} page${
              entry.outcome.count === 1 ? "" : "s"
            } matched.`,
          )
        : notice(
            "trail-err",
            "danger",
            entry.outcome.reason,
          ),
    ],
  );

const lineCard = (line: Line): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        line.who === "writer"
          ? "line-writer"
          : "line-assistant",
        sx.border,
        sx.rounded("md"),
        sx.p(2),
        sx.mb(1),
        ...(line.who === "assistant"
          ? [sx.bg("surface-2")]
          : [sx.bg("surface")]),
      ),
    ],
    [
      div(
        [
          sx.style_(
            "line-who",
            sx.text("sm"),
            sx.weight(700),
            sx.color("muted"),
          ),
        ],
        [
          text(
            line.who === "writer"
              ? "Reader"
              : "Assistant",
          ),
        ],
      ),
      p(
        [
          sx.style_(
            "line-text",
            sx.mt(1),
            sx.mb(0),
          ),
        ],
        [text(line.text)],
      ),
    ],
  );

/* ------------------------------------------------ *
 * Page                                              *
 * ------------------------------------------------ */

const viewReady = (
  model: Model,
  ready: Ready,
): ReadonlyArray<Flow<Msg>> => [
  panel(
    "Type a query",
    "Query commands",
    "A deterministic, model-free query language drives each variant — the same queries the voice assistant calls. Each verb targets one variant's pane; run several to compare.",
    [commandBox(model), commandHint],
  ),
  panel(
    "Compare the variants",
    "Three navigations, one corpus",
    "The same classification navigated three ways, side by side. Click a tag to facet, click any result page to focus the link graph on it, or type a query.",
    [variantsGrid(model, ready)],
  ),
  panel(
    "Proof · queries",
    "Query trail",
    "Every query and how many pages it matched (or, for a bad command, the typed reason).",
    model.queryTrail.length === 0
      ? [
          notice(
            "trail-empty",
            "muted",
            "No queries yet — run one above.",
          ),
        ]
      : model.queryTrail.map(trailCard),
  ),
  panel(
    "Talk to it (optional)",
    "Voice session",
    "The bonus path: start a Realtime voice session and ask the assistant to find pages; it calls the same query tools. Needs OPENAI_API_KEY on the server.",
    [
      ...(ready.configured
        ? []
        : [
            notice(
              "session-unconfigured",
              "danger",
              "The assistant is not configured — the server has no OPENAI_API_KEY, so a voice session will fail. The query box still works.",
            ),
          ]),
      sessionControls(model),
      sessionStatus(model),
    ],
  ),
  ...(model.transcript.length === 0
    ? []
    : [
        panel(
          "Conversation",
          "Transcript",
          "What was said, both ways.",
          model.transcript.map(lineCard),
        ),
      ]),
];

export const view = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "poc6",
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
            "poc6-col",
            sx.maxW(220),
            sx.decl("margin", "0 auto"),
          ),
        ],
        [
          hero,
          ...(model.assets.kind === "loading"
            ? [
                notice(
                  "assets-loading",
                  "muted",
                  "Loading the classified corpus…",
                ),
              ]
            : model.assets.kind === "failed"
              ? [
                  notice(
                    "assets-failed",
                    "danger",
                    `The corpus failed to load: ${model.assets.reason}`,
                  ),
                ]
              : viewReady(
                  model,
                  model.assets.ready,
                )),
        ],
      ),
    ],
  );
