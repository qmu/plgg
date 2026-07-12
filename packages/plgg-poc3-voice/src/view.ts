/**
 * PoC 3's page: one voice-session control, the open
 * document (the "same page" the writer and assistant
 * share), the conversation transcript, and the
 * agent-driven search trail — every `search_docs` call
 * the model made, with the keyword variations it tried
 * and what they hit. All states are designed (loading /
 * failed / keyless / idle / starting / live / failed
 * session — self-explanatory-ui policy).
 */
import {
  type SoftStr,
  type Option,
  isSome,
  pipe,
  matchOption,
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
  button,
  select,
  option,
  text,
  href,
  attr,
  type_,
  onClick,
  onChange,
} from "plgg-view";
import * as sx from "plgg-view/style";
import type {
  Model,
  Msg,
  Ready,
  DocRef,
} from "./app.ts";
import { encodeDoc, openDocText } from "./app.ts";
import type {
  Corpus,
  Line,
  ToolTrail,
} from "./agent.ts";
import { docFiles } from "./agent.ts";
import type { FtsIndex } from "./poc1.ts";

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

// The fleet's shared grouping primitive.
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
        eyebrow("plggpress PoC fleet · No. 3"),
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
      [text("Writer-Side Voice Assistant")],
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
          "Talk to the docs about the open document. The assistant grounds itself by DRIVING the browser-local full-text search — watch it try keyword variations in the trail below until the corpus vocabulary matches.",
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
          "Honest data note: your voice streams to OpenAI's Realtime API over WebRTC, authorized by a SHORT-LIVED key this site's server mints — the standing key never reaches the browser. Document retrieval itself runs locally over the shipped index.",
        ),
      ],
    ),
  ],
);

/* ------------------------------------------------ *
 * Session panel                                     *
 * ------------------------------------------------ */

const sessionStatus = (
  model: Model,
): Html<Msg, "p"> => {
  switch (model.session.kind) {
    case "idle":
      return notice(
        "session-idle",
        "muted",
        "No session — press Start and allow the microphone.",
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
        "Live — speak; the assistant hears you and answers aloud.",
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

/* ------------------------------------------------ *
 * Document panel                                    *
 * ------------------------------------------------ */

const docOption = (
  corpus: Corpus,
  file: SoftStr,
  picked: Option<DocRef>,
): Html<Msg, "option"> => {
  const value = encodeDoc({ corpus, file });
  const isPicked =
    isSome(picked) &&
    encodeDoc(picked.content) === value;
  return option(
    [
      attr("value", value),
      ...(isPicked ? [attr("selected", "")] : []),
    ],
    [
      text(
        `${corpus === "qmu-ja" ? "qmu.co.jp" : "guide"} — ${file}`,
      ),
    ],
  );
};

const docPicker = (
  model: Model,
  ready: Ready,
): Html<Msg, "select"> =>
  select(
    [
      onChange((value): Msg => ({
        kind: "DocPicked",
        value,
      })),
      ...(model.session.kind === "live" ||
      model.session.kind === "starting"
        ? [attr("disabled", "")]
        : []),
      attr("aria-label", "Open document"),
      sx.style_(
        "doc-picker",
        sx.bg("surface"),
        sx.border,
        sx.rounded("md"),
        sx.px(3),
        sx.py(2),
        sx.mb(3),
        sx.decl("max-width", "100%"),
      ),
    ],
    [
      ...pipe(
        ready.ja,
        matchOption(
          (): ReadonlyArray<
            Html<Msg, "option">
          > => [],
          (ja: FtsIndex) =>
            docFiles(ja).map((file) =>
              docOption(
                "qmu-ja",
                file,
                model.doc,
              ),
            ),
        ),
      ),
      ...docFiles(ready.en).map((file) =>
        docOption("guide", file, model.doc),
      ),
    ],
  );

const docPane = (
  model: Model,
  ready: Ready,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "doc-pane",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface-2"),
        sx.p(3),
        sx.text("sm"),
        sx.decl("max-height", "20rem"),
        sx.decl("overflow-y", "auto"),
        sx.decl("white-space", "pre-wrap"),
      ),
    ],
    [
      pipe(
        openDocText(ready, model.doc),
        matchOption(
          (): Flow<Msg> =>
            text(
              "No document opened — pick one above.",
            ),
          (doc): Flow<Msg> => text(doc.text),
        ),
      ),
    ],
  );

/* ------------------------------------------------ *
 * Conversation + trail                              *
 * ------------------------------------------------ */

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
              ? "Writer"
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

const trailCard = (
  call: ToolTrail,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "trail-call",
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
            "trail-keywords",
            sx.weight(600),
            sx.text("sm"),
          ),
        ],
        [
          text(
            `search_docs("${call.keywords}") → ${call.corpus === "qmu-ja" ? "qmu.co.jp policies (JA)" : "plgg guide (EN)"}`,
          ),
        ],
      ),
      ...(call.hits.length === 0
        ? [
            notice(
              "trail-miss",
              "muted",
              "0 hits — the model was told to try other keywords.",
            ),
          ]
        : call.hits.map((hit) =>
            div(
              [
                sx.style_(
                  "trail-hit",
                  sx.text("sm"),
                  sx.color("muted"),
                  sx.mt(1),
                ),
              ],
              [
                text(
                  `${hit.headingPath} (score ${hit.score.toFixed(2)})`,
                ),
              ],
            ),
          )),
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
    "Talk",
    "Voice session",
    "One button: the server mints a short-lived Realtime key, the browser opens WebRTC with your microphone, and the assistant joins you on the open document.",
    [
      ...(ready.configured
        ? []
        : [
            notice(
              "session-unconfigured",
              "danger",
              "The assistant is not configured — the server has no OPENAI_API_KEY, so starting a session will fail with an honest error.",
            ),
          ]),
      sessionControls(model),
      sessionStatus(model),
    ],
  ),
  panel(
    "Same page",
    "Open document",
    "What you and the assistant are both looking at — its full text is in the session instructions. Pick before starting; the document is fixed for the session.",
    [
      docPicker(model, ready),
      docPane(model, ready),
    ],
  ),
  panel(
    "Conversation",
    "Transcript",
    "What was said, both ways (the writer side is Whisper's transcription of your speech).",
    model.transcript.length === 0
      ? [
          notice(
            "transcript-empty",
            "muted",
            "Nothing yet — start a session and speak.",
          ),
        ]
      : model.transcript.map(lineCard),
  ),
  panel(
    "Proof",
    "Agent-driven search trail",
    "Every search_docs call the assistant made: the keyword variations it tried, which corpus they hit, and what came back. This is the PoC 2 verdict's accepted design, visible.",
    model.trail.length === 0
      ? [
          notice(
            "trail-empty",
            "muted",
            "No tool calls yet — ask the assistant something the docs answer.",
          ),
        ]
      : model.trail.map(trailCard),
  ),
];

export const view = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "poc3",
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
            "poc3-col",
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
                  "Loading the shipped indexes…",
                ),
              ]
            : model.assets.kind === "failed"
              ? [
                  notice(
                    "assets-failed",
                    "danger",
                    `Indexes failed to load: ${model.assets.reason}`,
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
