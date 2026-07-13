/**
 * PoC 4b's page: the session-bearing shell where the
 * change happens ON the preview. Voice + typed controls,
 * the conversation transcript, the agent's search + edit
 * trails, and — the heart of this PoC — the LIVE PREVIEW
 * surface: the open document rendered as prose that THIS
 * page patches in place (no iframe, no reload), with the
 * latest edit visualized two ways (a toggle): a
 * micro-animation (erase → write) and a before/after
 * diff. Both are driven by the SAME pure diff segments.
 *
 * All states are designed (loading / failed / keyless /
 * idle / starting / live / failed session / empty preview
 * / mid-animation / diff-shown / refused edit / mode
 * toggle — self-explanatory-ui policy).
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
  span,
  form,
  input,
  button,
  select,
  option,
  text,
  attr,
  href,
  type_,
  value_,
  placeholder_,
  key,
  slideIn,
  fadeOut,
  onClick,
  onChange,
  onInput,
  onSubmit,
} from "plgg-view";
import * as sx from "plgg-view/style";
import type {
  Model,
  Msg,
  Ready,
  VizMode,
  EditPhase,
} from "./app.ts";
import type {
  Line,
  ToolTrail,
  EditTrail,
} from "./agent.ts";
import { docFiles } from "./agent.ts";
import {
  type DocSegment,
  refineChange,
} from "./edit.ts";

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
        eyebrow("plggpress PoC fleet · No. 4b"),
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
          "Live Co-editing — the change happens ON the preview",
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
          "Ask the assistant — by voice or typed text — to change the open document. It edits GRANULARLY (a small find/replace), and the change lands ON the preview below: the edited span erases and the new text writes in, or shows an old-vs-new diff — no page reload, the same realtime session talking throughout.",
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
        "Session live — it stays connected while the preview updates; speak or type below.",
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
 * The typed-turn path: an input + send over the SAME live
 * session as the voice path. Disabled (with the reason
 * visible in the status line) until the session is live.
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
              ? "Type to the assistant — e.g. “change the first heading to say Welcome”"
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
 * The live preview surface (the heart of 4b)        *
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

/** The mode toggle — the two compared visualizations. */
const modeButton = (
  model: Model,
  mode: VizMode,
  label: SoftStr,
): Html<Msg, "button"> => {
  const active = model.vizMode === mode;
  return button(
    [
      type_("button"),
      onClick<Msg>({
        kind: "VizModePicked",
        mode,
      }),
      attr(
        "aria-pressed",
        active ? "true" : "false",
      ),
      sx.style_(
        `mode-${mode}`,
        sx.rounded("md"),
        sx.px(3),
        sx.py(1),
        sx.text("sm"),
        sx.weight(600),
        sx.pointer,
        ...(active
          ? [
              sx.bg("primary"),
              sx.color("primary-text"),
            ]
          : [sx.bg("surface-2"), sx.border]),
      ),
    ],
    [text(label)],
  );
};

const modeToggle = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "mode-toggle",
        sx.flex,
        sx.items("center"),
        sx.gap(2),
        sx.mb(3),
      ),
    ],
    [
      span(
        [
          sx.style_(
            "mode-label",
            sx.text("sm"),
            sx.color("muted"),
          ),
        ],
        [text("Visualize the change as:")],
      ),
      modeButton(model, "animation", "Animation"),
      modeButton(model, "diff", "Before / after"),
    ],
  );

const KEPT = sx.style_(
  "seg-kept",
  sx.decl("white-space", "pre-wrap"),
);

const STRIKE = sx.style_(
  "seg-before",
  sx.color("muted"),
  sx.decl("text-decoration", "line-through"),
  sx.decl("white-space", "pre-wrap"),
);

const HIGHLIGHT = sx.style_(
  "seg-after",
  sx.weight(700),
  sx.rounded("sm"),
  sx.decl("white-space", "pre-wrap"),
  sx.decl("background", "rgba(56,189,248,0.28)"),
  sx.decl(
    "box-shadow",
    "0 0 0 2px rgba(56,189,248,0.28)",
  ),
);

const keptText = (
  value: SoftStr,
): Html<Msg, "span"> =>
  span([KEPT], [text(value)]);

/**
 * The before/after diff rendering of one changed span:
 * shared context kept plain, the differing middle shown as
 * old (struck) beside new (highlighted). Static — the
 * "here is what I changed, confirm it" review view.
 */
const diffSpan = (
  before: SoftStr,
  after: SoftStr,
): Html<Msg, "span"> => {
  const r = refineChange(before, after);
  return span(
    [sx.style_("seg-diff")],
    [
      text(r.prefix),
      ...(r.before === ""
        ? []
        : [span([STRIKE], [text(r.before)])]),
      ...(r.after === ""
        ? []
        : [span([HIGHLIGHT], [text(r.after)])]),
      text(r.suffix),
    ],
  );
};

/**
 * The micro-animation rendering of one changed span: the
 * shared context kept plain; the differing middle is a
 * keyed node that, when the phase flips erasing→writing,
 * removes the struck OLD text (fadeOut) and inserts the
 * NEW text (slideIn) — the "watch the hand move" view. The
 * key carries the edit's sequence so a fresh edit
 * re-triggers the motion.
 */
const animatedSpan = (
  before: SoftStr,
  after: SoftStr,
  editSeq: number,
  idx: number,
  phase: EditPhase,
): Html<Msg, "span"> => {
  const r = refineChange(before, after);
  return span(
    [sx.style_("seg-anim")],
    [
      text(r.prefix),
      phase === "erasing"
        ? span(
            [
              key(`erase-${editSeq}-${idx}`),
              STRIKE,
              fadeOut(220),
            ],
            [
              text(
                r.before === ""
                  ? r.after
                  : r.before,
              ),
            ],
          )
        : span(
            [
              key(`write-${editSeq}-${idx}`),
              HIGHLIGHT,
              slideIn("0.35em", 280),
            ],
            [text(r.after)],
          ),
      text(r.suffix),
    ],
  );
};

const segmentView = (
  model: Model,
  seg: DocSegment,
  idx: number,
): Html<Msg, "span"> =>
  seg.kind === "kept"
    ? keptText(seg.text)
    : model.vizMode === "diff"
      ? diffSpan(seg.before, seg.after)
      : animatedSpan(
          seg.before,
          seg.after,
          model.editSeq,
          idx,
          model.editPhase,
        );

const previewSurface = (
  model: Model,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "preview",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface"),
        sx.p(4),
        sx.decl("white-space", "pre-wrap"),
        sx.decl(
          "font-family",
          "ui-serif, Georgia, serif",
        ),
        sx.decl("line-height", "1.6"),
        sx.decl("max-height", "28rem"),
        sx.decl("overflow", "auto"),
      ),
    ],
    model.preview.length === 0
      ? [
          notice(
            "preview-empty",
            "muted",
            "No document open — pick one above.",
          ),
        ]
      : model.preview.map((seg, idx) =>
          segmentView(model, seg, idx),
        ),
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
        [text(`edit_doc("${edit.path}")`)],
      ),
      edit.outcome.kind === "landed"
        ? notice(
            "edit-ok",
            "muted",
            `Changed ${edit.outcome.spans} span${
              edit.outcome.spans === 1 ? "" : "s"
            } — it animated on the preview; the session stayed live.`,
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
    "One session, two input paths: the microphone from PoC 3, plus a typed turn over the same data channel. The server mints a short-lived key; the session survives every edit — the preview updates without any reload.",
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
    "The change happens here",
    "Live preview",
    "The open document, rendered as prose THIS page patches in place. When the assistant edits, the changed span animates (erase → write) or shows a before/after diff — toggle between the two — with NO reload. Pick the document before starting; it is fixed for the session.",
    [
      modeToggle(model),
      docPicker(model, ready),
      previewSurface(model),
    ],
  ),
  panel(
    "Proof · edits",
    "Agent edit trail",
    "Every edit_doc call the assistant made: which file it changed and how many spans the confined write seam applied.",
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
        "poc4b",
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
            "poc4b-col",
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
