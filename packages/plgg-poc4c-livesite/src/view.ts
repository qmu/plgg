/**
 * PoC 4c's page: the session-bearing shell. Voice + typed
 * controls, the conversation transcript, the agent's
 * search trail, the edit trail, and — the point of this
 * PoC — the open document rendered by plggpress dev inside
 * an iframe, which does NOT reload when an edit lands: the
 * injected client animates the edited span in place.
 *
 * The one panel that is new to 4c is the patch status. It
 * says out loud whether the last edit was WATCHED on the
 * real page or fell back to a reload, and when it fell
 * back, why. That is the PoC's measurement, and hiding it
 * would make the whole exercise worthless — a gap you
 * cannot see is a gap you cannot judge.
 *
 * All states are designed (loading / failed / keyless /
 * idle / starting / live / failed session / refused edit /
 * unmapped span — self-explanatory-ui policy).
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
} from "./poc4b.ts";
import { docFiles } from "./poc4b.ts";
import { DOC_FRAME_ID } from "./effects.ts";

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
        eyebrow("plggpress PoC fleet · No. 4c"),
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
          "Watchable Edits on the Real Rendered Site",
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
          "PoC 4 served the real site but an edit arrived as a page reload; PoC 4b made the change watchable but on a preview it owned. This is both at once: the document below is the REAL plggpress render, and when the assistant edits it, the changed span erases and rewrites itself in place — no reload, session unbroken, file correct on disk.",
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
        "Session live — it stays connected across every edit; speak or type below.",
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
              ? "Type to the assistant — e.g. “change ‘web development’ to ‘web plus AI development’”"
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
 * Document panel (picker + the REAL rendered page)  *
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
 * under /docs/ so it shares this origin — which is what
 * lets the shell postMessage into it at all. The proxy
 * swapped the dev server's live-reload script for the
 * injected patch client, so an agent edit animates here
 * instead of reloading.
 *
 * The id is load-bearing, not decoration: `effects.ts`
 * finds this frame by it to post the patch in.
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
                attr("id", DOC_FRAME_ID),
                attr("src", routeOf(file)),
                attr(
                  "title",
                  "Open document (the real plggpress render — the assistant's edits animate in place)",
                ),
                sx.style_(
                  "doc-frame",
                  sx.decl("display", "block"),
                  sx.decl("width", "100%"),
                  sx.decl("height", "32rem"),
                  sx.decl("border", "0"),
                ),
              ],
              [],
            ),
        ),
      ),
    ],
  );

/**
 * THE MEASUREMENT — what became of the last edit on the
 * real page. `watched` is the confidence signal itself;
 * `reloaded` is the honest fallback, named with the reason
 * the span could not be mapped, because an unreported gap
 * is worse than the gap.
 */
const patchStatus = (
  model: Model,
): Html<Msg, "p"> => {
  switch (model.patch.kind) {
    case "idle":
      return notice(
        "patch-idle",
        "muted",
        "No edit yet — ask the assistant to change a word in the document above.",
      );
    case "armed":
      return notice(
        "patch-armed",
        "muted",
        "Edit in flight — the rendered page is holding its reload so the change can be watched instead.",
      );
    case "watched":
      return notice(
        "patch-watched",
        "muted",
        `Watched in place: ${model.patch.spans} span${
          model.patch.spans === 1 ? "" : "s"
        } animated on the REAL rendered page — no reload, session unbroken.`,
      );
    case "reloaded":
      return notice(
        "patch-reloaded",
        "danger",
        `Fell back to a reload (${model.patch.failure}): ${model.patch.reason} The edit IS on disk and the page above reloaded to show it — you saw PoC 4's behaviour, not 4c's.`,
      );
  }
};

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
            `Landed on disk — ${edit.outcome.spans} granular span${
              edit.outcome.spans === 1 ? "" : "s"
            } replaced; the session stays live.`,
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
    "One session, two input paths: the microphone from PoC 3, plus a typed turn over the same data channel. The server mints a short-lived key; this shell never reloads, so the session survives every edit.",
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
    "The real thing",
    "Open document (the actual rendered page)",
    "This is the plggpress dev server's own render of the seeded corpus copy — its markup, its styling, its hot reload — proxied under /docs/. Ask for a change and watch the span erase and rewrite itself right here. Pick before starting; the document is fixed for the session.",
    [docPicker(model, ready), docPane(model)],
  ),
  panel(
    "Proof · the signal",
    "Was the change watchable?",
    "The question this PoC exists to answer. An edit either animates in place on the real page (4c's signal) or falls back to a reload — and if it falls back, the reason is named here rather than hidden.",
    [patchStatus(model)],
  ),
  panel(
    "Proof · edits",
    "Agent edit trail",
    "Every edit_doc call the assistant made: which file it changed through POST /api/edit, and whether the confined write seam accepted the granular find/replace ops.",
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
        "poc4c",
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
            "poc4c-col",
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
