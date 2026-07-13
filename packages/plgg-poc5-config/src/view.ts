/**
 * PoC 5's page: the config-maintenance shell. A typed
 * COMMAND box (the deterministic, model-free path), the
 * clickable theme/layout switches, the current central
 * CONFIGURATION rendered as data, and — the heart — the
 * SAMPLE SITE that re-renders live from the config: pages
 * classified by colored tag chips, excluded paths hidden,
 * the grid re-laid-out and re-sized. The Realtime voice
 * session is a bonus panel next to it.
 *
 * All states are designed (loading / failed / empty /
 * applied / refused — self-explanatory-ui policy).
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
  type TagColor,
  type SizingTheme,
  type Layout,
  colorHex,
  sizingScale,
  sizingThemeLabel,
  layoutLabel,
  layoutColumns,
  SIZING_THEMES,
  LAYOUTS,
} from "./config.ts";
import {
  type Page,
  visiblePages,
  tagDefFor,
} from "./pages.ts";
import type { Line, ConfigTrail } from "./agent.ts";

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
        eyebrow("plggpress PoC fleet · No. 5"),
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
          "Central configuration generation — the agent maintains the site's config",
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
          "Type a config command — or ask the assistant by voice — to classify a tag, exclude a path, or switch the sizing theme and layout. The site's central configuration is typed data, and the sample site below re-renders live from it, with no reload.",
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
          "Honest note: the typed command path is fully deterministic and needs no model. The optional voice path streams to OpenAI's Realtime API under a SHORT-LIVED key the server mints; the standing key never reaches the browser. The config is client state — the sample site is a git-ignored copy of the guide corpus.",
        ),
      ],
    ),
  ],
);

/* ------------------------------------------------ *
 * Command panel                                     *
 * ------------------------------------------------ */

const commandBox = (
  model: Model,
): Html<Msg, "form"> =>
  form(
    [
      onSubmit<Msg>({ kind: "CommandSubmitted" }),
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
            "e.g. tag concepts color=success emoji=🧠 name=Core Ideas",
          ),
          attr("aria-label", "Config command"),
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
      "tag <slug> [name=..] [color=..] [emoji=..] [desc=..] · exclude <glob> · include <glob> · theme <sz-…> · layout <single-column|multi-column|wide>",
    ),
  ],
);

/* ------------------------------------------------ *
 * Theme / layout switches                           *
 * ------------------------------------------------ */

const themeButton = (
  model: Model,
  theme: SizingTheme,
): Html<Msg, "button"> => {
  const active = model.config.sizingTheme === theme;
  return button(
    [
      type_("button"),
      onClick<Msg>({
        kind: "OpRequested",
        op: { kind: "SetSizingTheme", theme },
      }),
      attr(
        "aria-pressed",
        active ? "true" : "false",
      ),
      sx.style_(
        `theme-${theme}`,
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
    [text(sizingThemeLabel(theme))],
  );
};

const layoutButton = (
  model: Model,
  layout: Layout,
): Html<Msg, "button"> => {
  const active = model.config.layout === layout;
  return button(
    [
      type_("button"),
      onClick<Msg>({
        kind: "OpRequested",
        op: { kind: "SetLayout", layout },
      }),
      attr(
        "aria-pressed",
        active ? "true" : "false",
      ),
      sx.style_(
        `layout-${layout}`,
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
    [text(layoutLabel(layout))],
  );
};

const switchRow = (
  label: SoftStr,
  buttons: ReadonlyArray<Flow<Msg>>,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "switch-row",
        sx.flex,
        sx.items("center"),
        sx.wrap,
        sx.gap(2),
        sx.mb(2),
      ),
    ],
    [
      span(
        [
          sx.style_(
            "switch-label",
            sx.text("sm"),
            sx.color("muted"),
          ),
        ],
        [text(label)],
      ),
      ...buttons,
    ],
  );

/* ------------------------------------------------ *
 * Tag chip                                          *
 * ------------------------------------------------ */

const solidChip = (
  color: TagColor,
  label: SoftStr,
): Html<Msg, "span"> =>
  span(
    [
      sx.style_(
        "chip",
        sx.rounded("full"),
        sx.px(2),
        sx.py(1),
        sx.text("sm"),
        sx.weight(600),
        sx.decl("background", colorHex(color)),
        sx.decl("color", "#ffffff"),
        sx.decl("white-space", "nowrap"),
      ),
    ],
    [text(label)],
  );

const mutedChip = (
  label: SoftStr,
): Html<Msg, "span"> =>
  span(
    [
      sx.style_(
        "chip-muted",
        sx.rounded("full"),
        sx.border,
        sx.px(2),
        sx.py(1),
        sx.text("sm"),
        sx.color("muted"),
        sx.decl("white-space", "nowrap"),
      ),
    ],
    [text(label)],
  );

/** A page's tag chip, colored by the config's TagDef. */
const pageChip = (
  model: Model,
  page: Page,
): Html<Msg, "span"> => {
  const slug = page.tags[0];
  if (slug === undefined) {
    return mutedChip("untagged");
  }
  const def = tagDefFor(model.config, slug);
  return isSome(def)
    ? solidChip(
        def.content.color,
        `${def.content.emoji} ${def.content.name}`,
      )
    : mutedChip(slug);
};

/* ------------------------------------------------ *
 * The sample-site preview (the heart of PoC 5)      *
 * ------------------------------------------------ */

const pageCard = (
  model: Model,
  page: Page,
): Html<Msg, "div"> => {
  const scale = sizingScale(model.config.sizingTheme);
  return div(
    [
      sx.style_(
        "page-card",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface"),
        sx.decl("padding", `${scale.padPx}px`),
        sx.decl(
          "display",
          "flex",
        ),
        sx.decl("flex-direction", "column"),
        sx.decl("gap", `${scale.gapPx}px`),
      ),
    ],
    [
      div(
        [sx.style_("page-chiprow")],
        [pageChip(model, page)],
      ),
      p(
        [
          sx.style_(
            "page-path",
            sx.mb(0),
            sx.decl(
              "font-family",
              "ui-monospace, SFMono-Regular, Menlo, monospace",
            ),
          ),
        ],
        [text(page.path)],
      ),
    ],
  );
};

const sampleSite = (
  model: Model,
  ready: Ready,
): Html<Msg, "div"> => {
  const scale = sizingScale(model.config.sizingTheme);
  const cols = layoutColumns(model.config.layout);
  const shown = visiblePages(
    model.config,
    ready.pages,
  );
  return div(
    [
      sx.style_(
        "sample-site",
        sx.border,
        sx.rounded("md"),
        sx.bg("surface-2"),
        sx.p(4),
        sx.decl("font-size", `${scale.basePx}px`),
        sx.decl("max-height", "30rem"),
        sx.decl("overflow", "auto"),
      ),
    ],
    shown.length === 0
      ? [
          notice(
            "site-empty",
            "muted",
            "Every page is excluded — remove an exclusion with `include <glob>`.",
          ),
        ]
      : [
          div(
            [
              sx.style_(
                "site-grid",
                sx.decl("display", "grid"),
                sx.decl(
                  "grid-template-columns",
                  `repeat(${cols}, minmax(0, 1fr))`,
                ),
                sx.decl(
                  "gap",
                  `${scale.gapPx + 6}px`,
                ),
              ),
            ],
            shown.map((page) =>
              pageCard(model, page),
            ),
          ),
        ],
  );
};

/* ------------------------------------------------ *
 * Current configuration (as data)                   *
 * ------------------------------------------------ */

const tagRow = (
  tag: Readonly<{
    slug: SoftStr;
    name: SoftStr;
    color: TagColor;
    emoji: SoftStr;
    description: SoftStr;
  }>,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        "config-tag",
        sx.flex,
        sx.items("center"),
        sx.gap(2),
        sx.mb(1),
      ),
    ],
    [
      solidChip(
        tag.color,
        `${tag.emoji} ${tag.name}`,
      ),
      span(
        [
          sx.style_(
            "config-tag-slug",
            sx.text("sm"),
            sx.color("muted"),
            sx.decl(
              "font-family",
              "ui-monospace, SFMono-Regular, Menlo, monospace",
            ),
          ),
        ],
        [text(tag.slug)],
      ),
      span(
        [
          sx.style_(
            "config-tag-desc",
            sx.text("sm"),
            sx.color("muted"),
          ),
        ],
        [text(tag.description)],
      ),
    ],
  );

const configState = (
  model: Model,
): ReadonlyArray<Flow<Msg>> => [
  p(
    [
      sx.style_(
        "config-dials",
        sx.text("sm"),
        sx.mb(2),
      ),
    ],
    [
      text(
        `Layout: ${layoutLabel(model.config.layout)} · Sizing: ${sizingThemeLabel(model.config.sizingTheme)} · ${model.config.tags.length} tag${
          model.config.tags.length === 1 ? "" : "s"
        } · ${model.config.exclusions.length} exclusion${
          model.config.exclusions.length === 1
            ? ""
            : "s"
        }`,
      ),
    ],
  ),
  ...model.config.tags.map(tagRow),
  ...(model.config.exclusions.length === 0
    ? []
    : [
        p(
          [
            sx.style_(
              "config-exclusions",
              sx.text("sm"),
              sx.color("muted"),
              sx.mt(2),
              sx.mb(0),
              sx.decl(
                "font-family",
                "ui-monospace, SFMono-Regular, Menlo, monospace",
              ),
            ),
          ],
          [
            text(
              `excluded: ${model.config.exclusions.join(", ")}`,
            ),
          ],
        ),
      ]),
];

/* ------------------------------------------------ *
 * Session (voice bonus)                             *
 * ------------------------------------------------ */

const sessionStatus = (
  model: Model,
): Html<Msg, "p"> => {
  switch (model.session.kind) {
    case "idle":
      return notice(
        "session-idle",
        "muted",
        "No voice session — press Start and allow the microphone (optional; the command box needs no session).",
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
        "Session live — ask the assistant to change the configuration; it calls the same tools.",
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
 * Trails                                            *
 * ------------------------------------------------ */

const trailCard = (
  entry: ConfigTrail,
): Html<Msg, "div"> =>
  div(
    [
      sx.style_(
        entry.outcome.kind === "landed"
          ? "trail-landed"
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
      entry.outcome.kind === "landed"
        ? notice(
            "trail-ok",
            "muted",
            "Applied — the site re-rendered.",
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

/* ------------------------------------------------ *
 * Page                                              *
 * ------------------------------------------------ */

const lastChangeNote = (
  last: Option<SoftStr>,
): ReadonlyArray<Flow<Msg>> =>
  isSome(last)
    ? [
        notice(
          "last-change",
          "muted",
          `Last change: ${last.content}`,
        ),
      ]
    : [];

const viewReady = (
  model: Model,
  ready: Ready,
): ReadonlyArray<Flow<Msg>> => [
  panel(
    "Type a command",
    "Config commands",
    "A deterministic, model-free command language maintains the central configuration — the same ops the voice assistant calls. Reclassify a tag, exclude a path, switch the theme or layout, and watch the sample site re-render.",
    [
      commandBox(model),
      commandHint,
      switchRow(
        "Sizing theme:",
        SIZING_THEMES.map((theme) =>
          themeButton(model, theme),
        ),
      ),
      switchRow(
        "Layout:",
        LAYOUTS.map((layout) =>
          layoutButton(model, layout),
        ),
      ),
      ...lastChangeNote(model.lastChange),
    ],
  ),
  panel(
    "The config renders here",
    "Sample site",
    "The corpus rendered from the current configuration: each page classified by its colored tag chip, excluded paths hidden, the grid re-laid-out by the layout and re-sized by the sizing theme — live, no reload.",
    [sampleSite(model, ready)],
  ),
  panel(
    "The generated data",
    "Central configuration",
    "The typed configuration value the agent maintains — the durable data the site reads. This is what `npx plggpress` would persist.",
    configState(model),
  ),
  panel(
    "Proof · changes",
    "Config trail",
    "Every command and tool call, and whether it landed or was refused (with the typed reason).",
    model.configTrail.length === 0
      ? [
          notice(
            "trail-empty",
            "muted",
            "No changes yet — run a command above.",
          ),
        ]
      : model.configTrail.map(trailCard),
  ),
  panel(
    "Talk to it (optional)",
    "Voice session",
    "The bonus path: start a Realtime voice session and ask the assistant to change the configuration; it calls the same tools. Needs OPENAI_API_KEY on the server.",
    [
      ...(ready.configured
        ? []
        : [
            notice(
              "session-unconfigured",
              "danger",
              "The assistant is not configured — the server has no OPENAI_API_KEY, so a voice session will fail. The command box still works.",
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
        "poc5",
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
            "poc5-col",
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
                  "Loading the sample site…",
                ),
              ]
            : model.assets.kind === "failed"
              ? [
                  notice(
                    "assets-failed",
                    "danger",
                    `The pages failed to load: ${model.assets.reason}`,
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
