/**
 * PoC 4's page: the session-bearing shell. Voice + typed
 * controls, the conversation transcript, the agent's
 * search trail, the EDIT trail (which file the agent
 * wrote and what became of it), and the open document
 * rendered by plggpress dev inside an iframe — the ONLY
 * pane that reloads when an edit lands. All states are
 * designed (loading / failed / keyless / idle / starting
 * / live / failed session / refused edit —
 * self-explanatory-ui policy).
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
  form,
  input,
  button,
  select,
  option,
  text,
  el,
  slot,
  href,
  attr,
  type_,
  value_,
  placeholder_,
  onClick,
  onChange,
  onInput,
  onSubmit,
} from "plgg-view";
import * as sx from "plgg-view/style";
import type { Model, Msg, Ready } from "./app.ts";
import { routeOf } from "./app.ts";
import type {
  Line,
  ToolTrail,
  EditTrail,
} from "./agent.ts";
import { docFiles } from "./agent.ts";

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
        eyebrow("plggpress PoC fleet · No. 4"),
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
          "Agent File Edits with Live Hot Reload",
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
          "Ask the assistant — by voice or typed text — to change the open document. Its edit_file call lands on disk through the dev server, the doc pane below hot-reloads, and the SAME realtime session keeps talking: this shell never reloads (iframe isolation).",
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
          "Honest data note: your voice and typed turns stream to OpenAI's Realtime API, authorized by a SHORT-LIVED key this site's server mints — the standing key never reaches the browser. Search runs locally over the shipped index; edits write only a git-ignored COPY of the guide corpus.",
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
        "Session live — it stays connected across doc reloads; speak or type below.",
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
              : "Start session",
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

/**
 * The typed-turn path: an input + send over the SAME
 * live session as the voice path. Disabled (with the
 * reason visible in the status line) until the session
 * is live.
 */
const textTurnForm = (
  model: Model,
): Html<Msg, "form"> => {
  const live = model.session.kind === "live";
  return form(
    [
      onSubmit<Msg>({ kind: "TextSubmitted" }),
      sx.style_(
        "text-turn",
        sx.flex,
        sx.items("center"),
        sx.gap(2),
        sx.mt(2),
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
            live
              ? "Type to the assistant — e.g. “fix the typo in the first paragraph”"
              : "Start a session to type to the assistant",
          ),
          ...(live ? [] : [attr("disabled", "")]),
          attr(
            "aria-label",
            "Typed message to the assistant",
          ),
          sx.style_(
            "text-turn-input",
            sx.bg("surface"),
            sx.border,
            sx.rounded("md"),
            sx.px(3),
            sx.py(2),
            sx.decl("flex", "1 1 auto"),
            sx.decl("min-width", "0"),
          ),
        ],
        [],
      ),
      button(
        [
          type_("submit"),
          ...(live && model.draft.trim() !== ""
            ? []
            : [attr("disabled", "")]),
          sx.style_(
            "text-turn-send",
            sx.bg("primary"),
            sx.color("primary-text"),
            sx.rounded("md"),
            sx.px(4),
            sx.py(2),
            sx.weight(600),
            sx.pointer,
          ),
        ],
        [text("Send")],
      ),
    ],
  );
};

/* ------------------------------------------------ *
 * Document panel (picker + live iframe)             *
 * ------------------------------------------------ */

const docOption = (
  file: SoftStr,
  picked: Option<SoftStr>,
): Html<Msg, "option"> =>
  option(
    [
      attr("value", file),
      ...(isSome(picked) &&
      picked.content === file
        ? [attr("selected", "")]
        : []),
    ],
    [text(file)],
  );

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
    docFiles(ready.index).map((file) =>
      docOption(file, model.doc),
    ),
  );

/**
 * The doc pane IS the plggpress-rendered page, proxied
 * under /docs/ so it shares this origin. It carries the
 * dev live-reload script; when the agent's edit lands,
 * ONLY this iframe reloads.
 */
const docPane = (
  model: Model,
): Html<Msg, "div"> =>
  slot(
    [
      sx.style_(
        "doc-pane",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface"),
        sx.decl("overflow", "hidden"),
      ),
    ],
    [
      pipe(
        model.doc,
        matchOption(
          (): Html<Msg> =>
            notice(
              "doc-none",
              "muted",
              "No document opened — pick one above.",
            ),
          (file: SoftStr): Html<Msg> =>
            el(
              "iframe",
              [
                attr("src", routeOf(file)),
                attr(
                  "title",
                  "Open document (plggpress dev render — hot-reloads on agent edits)",
                ),
                sx.style_(
                  "doc-frame",
                  sx.decl("display", "block"),
                  sx.decl("width", "100%"),
                  sx.decl("height", "28rem"),
                  sx.decl("border", "0"),
                ),
              ],
              [],
            ),
        ),
      ),
    ],
  );

/* ------------------------------------------------ *
 * Conversation + trails                             *
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
        [text(`search_docs("${call.keywords}")`)],
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

const editCard = (
  edit: EditTrail,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        edit.outcome.kind === "landed"
          ? "edit-landed"
          : "edit-refused",
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
            "edit-path",
            sx.weight(600),
            sx.text("sm"),
          ),
        ],
        [text(`edit_file("${edit.path}")`)],
      ),
      edit.outcome.kind === "landed"
        ? notice(
            "edit-ok",
            "muted",
            "Landed on disk — the doc pane reloads by itself; the session stays live.",
          )
        : notice(
            "edit-error",
            "danger",
            edit.outcome.reason,
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
    "Talk or type",
    "Realtime session",
    "One session, two input paths: the microphone from PoC 3, plus a typed turn over the same data channel. The server mints a short-lived key; this shell never reloads, so the session survives every doc edit.",
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
      textTurnForm(model),
    ],
  ),
  panel(
    "Same page",
    "Open document (live render)",
    "The plggpress dev server renders the seeded corpus copy inside this iframe. When the assistant's edit lands, ONLY this pane hot-reloads — watch it refresh while the session above stays live. Pick before starting; the document is fixed for the session.",
    [docPicker(model, ready), docPane(model)],
  ),
  panel(
    "Proof · edits",
    "Agent edit trail",
    "Every edit_file call the assistant made: which file it wrote through POST /api/edit, and whether the confined write seam accepted it.",
    model.edits.length === 0
      ? [
          notice(
            "edits-empty",
            "muted",
            "No edits yet — ask the assistant to change something in the open document.",
          ),
        ]
      : model.edits.map(editCard),
  ),
  panel(
    "Conversation",
    "Transcript",
    "What was said, both ways — spoken turns via Whisper's transcription, typed turns as sent.",
    model.transcript.length === 0
      ? [
          notice(
            "transcript-empty",
            "muted",
            "Nothing yet — start a session, then speak or type.",
          ),
        ]
      : model.transcript.map(lineCard),
  ),
  panel(
    "Proof · search",
    "Agent-driven search trail",
    "Every search_docs call the assistant made over the corpus copy's index — refreshed after each landed edit, so the next search sees the new text.",
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
        "poc4",
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
            "poc4-col",
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
                  "Loading the corpus index…",
                ),
              ]
            : model.assets.kind === "failed"
              ? [
                  notice(
                    "assets-failed",
                    "danger",
                    `The index failed to load: ${model.assets.reason}`,
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
