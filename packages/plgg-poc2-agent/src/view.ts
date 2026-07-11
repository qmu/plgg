/**
 * PoC 2's page: one ask box, one canned-set button, and
 * the exchange trail — every answer rendered SIDE-BY-SIDE
 * with the evidence its retrieval selected, cited chunks
 * marked, each citation a heading-path link into the live
 * guide. All states are designed (loading / failed /
 * not-configured / asking / honest-no-citation /
 * answered — self-explanatory-ui policy); the missing-key
 * state is announced up front, never a surprise error.
 */
import { type SoftStr } from "plgg";
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
  Model,
  Msg,
  Ready,
  Exchange,
  Evidence,
  Outcome,
} from "./app.ts";
import {
  EVIDENCE_COUNT,
  CANNED_QUESTIONS,
} from "./canned.ts";

/** The live guide the citations link into. */
export const GUIDE_BASE =
  "https://plgg.qmu.co.jp";

/**
 * `concepts/option.md` → the guide route
 * `/concepts/option` (`index.md` → its directory root) —
 * the plggpress SSG's file→route scheme.
 */
export const guideHref = (
  file: SoftStr,
): SoftStr =>
  `${GUIDE_BASE}/${file
    .replace(/\.md$/, "")
    .replace(/(^|\/)index$/, "$1")}`;

const ms = (value: number): SoftStr =>
  `${value.toFixed(1)} ms`;

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

// The one grouping primitive, shared with PoC 1's design
// language: every functional area is a bordered card that
// names itself and says what you can do with it.
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
        eyebrow("plggpress PoC fleet · No. 2"),
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
          "Reader-Side Embedded Browser Agent",
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
          "Ask the guide a question. Retrieval runs in your browser over the shipped index (PoC 1's BM25 — no search backend); the answer is generated from exactly those chunks and cites them, so you can judge the grounding yourself.",
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
          "Honest data note: unlike PoC 1's fully-local search, your question and the retrieved excerpts leave the browser for the model call — through this site's server seam, which holds the key. No key, and no provider code, ships in this page.",
        ),
      ],
    ),
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

const askForm = (
  model: Model,
): Html<Msg, "form"> =>
  form(
    [
      onSubmit<Msg>({ kind: "Submitted" }),
      sx.style_(
        "ask-form",
        sx.flex,
        sx.gap(2),
        sx.mb(2),
      ),
    ],
    [
      input(
        [
          type_("text"),
          value_(model.draft),
          attr(
            "placeholder",
            "Ask the guide… (e.g. what should I use instead of null?)",
          ),
          attr("aria-label", "Question"),
          onInput((value): Msg => ({
            kind: "DraftChanged",
            value,
          })),
          sx.style_(
            "ask-input",
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
          ...(model.busy
            ? [attr("disabled", "")]
            : []),
          sx.style_(
            "ask-submit",
            sx.bg("primary"),
            sx.color("primary-text"),
            sx.rounded("md"),
            sx.px(4),
            sx.py(2),
            sx.weight(600),
            sx.pointer,
          ),
        ],
        [text(model.busy ? "Answering…" : "Ask")],
      ),
    ],
  );

const cannedRow = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "canned-row",
        sx.flex,
        sx.items("center"),
        sx.gap(3),
        sx.mb(4),
      ),
    ],
    [
      button(
        [
          type_("button"),
          onClick<Msg>({
            kind: "CannedRequested",
          }),
          ...(model.busy
            ? [attr("disabled", "")]
            : []),
          sx.style_(
            "canned-run",
            sx.bg("surface-2"),
            sx.border,
            sx.rounded("md"),
            sx.px(4),
            sx.py(2),
            sx.weight(600),
            sx.pointer,
          ),
        ],
        [
          text(
            `Run the ${CANNED_QUESTIONS.length}-question canned set`,
          ),
        ],
      ),
      ...(model.queue.length > 0
        ? [
            notice(
              "canned-progress",
              "muted",
              `${model.queue.length} question${model.queue.length === 1 ? "" : "s"} still queued…`,
            ),
          ]
        : []),
    ],
  );

const citationLinks = (
  exchange: Exchange,
  citations: ReadonlyArray<number>,
): ReadonlyArray<Flow<Msg>> =>
  citations.length === 0
    ? [
        notice(
          "answer-uncited",
          "muted",
          "No citation — the model reports the retrieved sources do not contain this answer.",
        ),
      ]
    : [
        div(
          [
            sx.style_(
              "citation-label",
              sx.text("sm"),
              sx.weight(600),
              sx.mb(1),
            ),
          ],
          [text("Citations")],
        ),
        ...exchange.evidence
          .filter((e) =>
            citations.includes(e.chunk.id),
          )
          .map((e) =>
            div(
              [
                sx.style_(
                  "citation-item",
                  sx.text("sm"),
                  sx.mb(1),
                ),
              ],
              [
                a(
                  [
                    href(guideHref(e.chunk.file)),
                    attr("target", "_blank"),
                    attr(
                      "rel",
                      "noreferrer noopener",
                    ),
                    sx.style_(
                      "citation-link",
                      sx.color("primary"),
                    ),
                  ],
                  [text(e.chunk.headingPath)],
                ),
              ],
            ),
          ),
      ];

const answerPane = (
  exchange: Exchange,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "answer-pane",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface"),
        sx.p(3),
      ),
    ],
    [
      h3(
        [
          sx.style_(
            "answer-title",
            sx.text("sm"),
            sx.weight(700),
            sx.mt(0),
            sx.mb(2),
          ),
        ],
        [text("Answer")],
      ),
      ...answerBody(exchange),
    ],
  );

const answerBody = (
  exchange: Exchange,
): ReadonlyArray<Flow<Msg>> => {
  const outcome: Outcome = exchange.outcome;
  switch (outcome.kind) {
    case "asking":
      return [
        notice(
          "answer-waiting",
          "muted",
          "Answering… (one model call through the server seam)",
        ),
      ];
    case "failed":
      return [
        notice(
          "answer-failed",
          "danger",
          outcome.reason,
        ),
      ];
    case "answered":
      return [
        p(
          [
            sx.style_(
              "answer-text",
              sx.mt(0),
              sx.mb(2),
            ),
          ],
          [text(outcome.answer.answer)],
        ),
        ...citationLinks(
          exchange,
          outcome.answer.citations,
        ),
        notice(
          "answer-timing",
          "muted",
          `answered in ${ms(outcome.ms)}`,
        ),
      ];
  }
};

const citedIdsOf = (
  outcome: Outcome,
): ReadonlyArray<number> =>
  outcome.kind === "answered"
    ? outcome.answer.citations
    : [];

const evidenceCard = (
  evidence: Evidence,
  cited: boolean,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        cited
          ? "evidence-hit-cited"
          : "evidence-hit",
        sx.border,
        sx.rounded("sm"),
        sx.p(2),
        sx.mb(1),
        ...(cited
          ? [
              sx.decl("border-color", "#1f6b54"),
              sx.decl("border-left-width", "4px"),
            ]
          : []),
      ),
    ],
    [
      div(
        [
          sx.style_(
            "evidence-path",
            sx.weight(600),
            sx.text("sm"),
          ),
        ],
        [
          text(
            cited
              ? `✓ cited — ${evidence.chunk.headingPath}`
              : evidence.chunk.headingPath,
          ),
        ],
      ),
      p(
        [
          sx.style_(
            "evidence-snippet",
            sx.text("sm"),
            sx.color("muted"),
            sx.mt(1),
            sx.mb(0),
          ),
        ],
        [
          text(
            evidence.chunk.text.length > 220
              ? `${evidence.chunk.text.slice(0, 220)}…`
              : evidence.chunk.text,
          ),
        ],
      ),
      div(
        [
          sx.style_(
            "evidence-score",
            sx.text("sm"),
            sx.color("muted"),
            sx.mt(1),
          ),
        ],
        [
          text(
            `score ${evidence.score.toFixed(3)}`,
          ),
        ],
      ),
    ],
  );

const evidencePane = (
  exchange: Exchange,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "evidence-pane",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface-2"),
        sx.p(3),
      ),
    ],
    [
      h3(
        [
          sx.style_(
            "evidence-title",
            sx.text("sm"),
            sx.weight(700),
            sx.mt(0),
            sx.mb(2),
          ),
        ],
        [
          text(
            `Retrieved evidence — local BM25, ${ms(exchange.retrieveMs)}`,
          ),
        ],
      ),
      ...(exchange.evidence.length === 0
        ? [
            notice(
              "evidence-empty",
              "muted",
              "No chunk matched — the answer below cannot be grounded.",
            ),
          ]
        : exchange.evidence.map((e) =>
            evidenceCard(
              e,
              citedIdsOf(
                exchange.outcome,
              ).includes(e.chunk.id),
            ),
          )),
    ],
  );

const exchangeCard = (
  exchange: Exchange,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "exchange",
        sx.border,
        sx.rounded("lg"),
        sx.bg("surface"),
        sx.p(4),
        sx.mb(4),
      ),
    ],
    [
      h3(
        [
          sx.style_(
            "exchange-q",
            sx.text("base"),
            sx.weight(700),
            sx.mt(0),
            sx.mb(3),
          ),
        ],
        [text(`Q. ${exchange.question}`)],
      ),
      div(
        [
          sx.style_(
            "exchange-panes",
            sx.grid,
            sx.gap(3),
            sx.decl(
              "grid-template-columns",
              "repeat(auto-fit, minmax(18rem, 1fr))",
            ),
          ),
        ],
        [
          answerPane(exchange),
          evidencePane(exchange),
        ],
      ),
    ],
  );

const viewReady = (
  model: Model,
  ready: Ready,
): ReadonlyArray<Flow<Msg>> => [
  panel(
    "Try it",
    "Ask the guide",
    `The shipped index holds ${ready.fts.chunks.length} chunks of the plgg guide; the top ${EVIDENCE_COUNT} matches ground each answer.`,
    [
      ...(ready.configured
        ? []
        : [
            notice(
              "agent-unconfigured",
              "danger",
              "The agent is not configured — the server has no OPENAI_API_KEY, so asking will fail with an honest error. Local retrieval still works.",
            ),
          ]),
      askForm(model),
      cannedRow(model),
      ...(model.exchanges.length === 0
        ? [
            notice(
              "exchanges-empty",
              "muted",
              "No questions asked yet — type one above, or run the canned set to see grounded answers next to their evidence.",
            ),
          ]
        : // Newest first: the latest exchange lands
          // right under the ask box (the model array
          // stays append-ordered — `Answered` patches
          // by index).
          [...model.exchanges]
            .reverse()
            .map(exchangeCard)),
    ],
  ),
];

export const view = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "poc2",
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
            "poc2-col",
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
                  "Loading the shipped index…",
                ),
              ]
            : model.assets.kind === "failed"
              ? [
                  notice(
                    "assets-failed",
                    "danger",
                    `Index failed to load: ${model.assets.reason}`,
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
