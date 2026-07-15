/**
 * PoC 5's assistant loop that is NOT a browser API — the
 * Realtime event decoder (decoding the FIVE central-
 * configuration tools into typed {@link ConfigOp}s) and
 * the session instructions. All total functions over plain
 * data, unit-tested offline; WebRTC lives in `vendors/`.
 * The voice path is a BONUS — the deterministic command
 * parser (command.ts) drives the same ops without a model.
 */
import {
  type SoftStr,
  type Option,
  type InvalidError,
  some,
  none,
  pipe,
  tryCatch,
  invalidError,
  matchResult,
  matchOption,
} from "plgg";
import {
  type Config,
  type TagColor,
  asTagColor,
  asSizingTheme,
  asLayout,
  sizingThemeLabel,
  layoutLabel,
} from "./config.ts";
import { type ConfigOp } from "./apply.ts";

/**
 * The pinned Realtime snapshot — the single source both
 * the server mint and the browser SDP exchange derive
 * from (carried from PoC 3/4/4b, pinned to 2.1 for its
 * stronger tool-calling discipline).
 */
export const REALTIME_MODEL = "gpt-realtime-2.1";

/** One transcript line of the conversation. */
export type Line = Readonly<{
  who: "writer" | "assistant";
  text: SoftStr;
}>;

/**
 * One config-tool call as the page shows it — which op the
 * writer's request became, and what became of it. Every
 * state is designed: a refusal names what went wrong
 * (self-explanatory-ui policy).
 */
export type ConfigTrail = Readonly<{
  summary: SoftStr;
  outcome:
    | Readonly<{ kind: "landed" }>
    | Readonly<{
        kind: "refused";
        reason: SoftStr;
      }>;
}>;

/* ------------------------------------------------ *
 * Session instructions                              *
 * ------------------------------------------------ */

/** Keep the config summary bounded in the instructions. */
export const TAG_BUDGET = 24;

const configSummary = (
  config: Config,
): SoftStr =>
  [
    `Layout: ${layoutLabel(config.layout)}. Sizing theme: ${sizingThemeLabel(config.sizingTheme)}.`,
    config.exclusions.length === 0
      ? "No path exclusions."
      : `Excluded paths: ${config.exclusions.join(", ")}.`,
    config.tags.length === 0
      ? "No tags classified yet."
      : `Tags: ${config.tags
          .slice(0, TAG_BUDGET)
          .map(
            (t) =>
              `${t.slug} → ${t.emoji} ${t.name} (${t.color})`,
          )
          .join("; ")}.`,
  ].join("\n");

/**
 * The session instructions: who the assistant is, how it
 * maintains the central configuration (call the tools;
 * never invent a color/theme/layout outside the closed
 * sets), and the current configuration so it edits from
 * the real state.
 */
export const instructionsOf = (
  config: Config,
  pageTags: ReadonlyArray<SoftStr>,
): SoftStr =>
  [
    "You are the writer-side configuration assistant embedded in a documentation site; the writer talks to you by voice or typed text.",
    "You maintain the site's CENTRAL CONFIGURATION by calling tools: classify a tag with set_tag (slug, name, color, emoji, description), hide pages with exclude_path (a path or glob), re-show them with include_path, switch the sizing with set_sizing_theme, and switch the page layout with set_layout.",
    "Colors are EXACTLY: primary, secondary, tertiary, success, danger, warning, info. Sizing themes are EXACTLY: sz-compact, sz-cozy, sz-comfortable, sz-relaxed, sz-spacious, sz-airy, sz-grand. Layouts are EXACTLY: single-column, multi-column, wide. Never invent a value outside these sets.",
    "A tag's slug must match the pages' derived tags so the classification lands. After a change, confirm to the writer exactly what you changed.",
    `The pages carry these derived tags: ${[...new Set(pageTags)].join(", ") || "(none)"}.`,
    "Current configuration:",
    configSummary(config),
  ].join("\n\n");

/* ------------------------------------------------ *
 * The five configuration tools                      *
 * ------------------------------------------------ */

export const SET_TAG_TOOL = {
  type: "function",
  name: "set_tag",
  description:
    "Classify (or re-classify) one tag. `slug` must match the pages' derived tag. `color` is one of primary, secondary, tertiary, success, danger, warning, info.",
  parameters: {
    type: "object",
    properties: {
      slug: { type: "string" },
      name: { type: "string" },
      color: { type: "string" },
      emoji: { type: "string" },
      description: { type: "string" },
    },
    required: ["slug", "name", "color", "emoji"],
    additionalProperties: false,
  },
};

export const EXCLUDE_PATH_TOOL = {
  type: "function",
  name: "exclude_path",
  description:
    "Hide pages matching a path or glob (e.g. `contributing/**`, `*.md`).",
  parameters: {
    type: "object",
    properties: { glob: { type: "string" } },
    required: ["glob"],
    additionalProperties: false,
  },
};

export const INCLUDE_PATH_TOOL = {
  type: "function",
  name: "include_path",
  description:
    "Remove a previously-added path exclusion (re-show those pages).",
  parameters: {
    type: "object",
    properties: { glob: { type: "string" } },
    required: ["glob"],
    additionalProperties: false,
  },
};

export const SET_SIZING_THEME_TOOL = {
  type: "function",
  name: "set_sizing_theme",
  description:
    "Switch the site's sizing theme. One of sz-compact, sz-cozy, sz-comfortable, sz-relaxed, sz-spacious, sz-airy, sz-grand.",
  parameters: {
    type: "object",
    properties: { theme: { type: "string" } },
    required: ["theme"],
    additionalProperties: false,
  },
};

export const SET_LAYOUT_TOOL = {
  type: "function",
  name: "set_layout",
  description:
    "Switch the page layout. One of single-column, multi-column, wide.",
  parameters: {
    type: "object",
    properties: { layout: { type: "string" } },
    required: ["layout"],
    additionalProperties: false,
  },
};

/** The whole tool set the session is opened with. */
export const CONFIG_TOOLS: ReadonlyArray<unknown> =
  [
    SET_TAG_TOOL,
    EXCLUDE_PATH_TOOL,
    INCLUDE_PATH_TOOL,
    SET_SIZING_THEME_TOOL,
    SET_LAYOUT_TOOL,
  ];

/**
 * A one-line human summary of a config op — the config
 * trail's label and the tool-output confirmation share it.
 */
export const summarizeOp = (
  op: ConfigOp,
): SoftStr => {
  switch (op.kind) {
    case "SetTag":
      return `set_tag ${op.tag.slug} → ${op.tag.emoji} ${op.tag.name} (${op.tag.color})`;
    case "ExcludePath":
      return `exclude_path ${op.glob}`;
    case "IncludePath":
      return `include_path ${op.glob}`;
    case "SetSizingTheme":
      return `set_sizing_theme ${op.theme}`;
    case "SetLayout":
      return `set_layout ${op.layout}`;
  }
};

/* ------------------------------------------------ *
 * Realtime event decoding (data channel → domain)   *
 * ------------------------------------------------ */

/** What the assistant loop can learn from one event. */
export type AgentEvent =
  | Readonly<{
      kind: "WriterSaid";
      text: SoftStr;
    }>
  | Readonly<{
      kind: "AssistantSaid";
      text: SoftStr;
    }>
  | Readonly<{
      kind: "ConfigCalled";
      callId: SoftStr;
      op: ConfigOp;
    }>
  | Readonly<{
      kind: "SessionErrored";
      reason: SoftStr;
    }>;

const strAt = (
  v: unknown,
  key: string,
): SoftStr => {
  const got: unknown =
    typeof v === "object" && v !== null
      ? Reflect.get(v, key)
      : undefined;
  return typeof got === "string" ? got : "";
};

const objAt = (
  v: unknown,
  key: string,
): unknown =>
  typeof v === "object" && v !== null
    ? Reflect.get(v, key)
    : undefined;

/** `arguments` is a JSON string; a bad one is `{}`. */
const argsOf = (raw: SoftStr): unknown =>
  pipe(
    tryCatch(
      (t: SoftStr): unknown => JSON.parse(t),
      (cause): InvalidError =>
        invalidError({
          message: "arguments not JSON",
          cause,
        }),
    )(raw),
    matchResult(
      (): unknown => ({}),
      (parsed: unknown): unknown => parsed,
    ),
  );

/** A set_tag call's args → a SetTag op (color defaulted). */
const tagOpOf = (args: unknown): ConfigOp => {
  const color: TagColor = pipe(
    asTagColor(strAt(args, "color")),
    matchOption(
      (): TagColor => "primary",
      (c: TagColor): TagColor => c,
    ),
  );
  return {
    kind: "SetTag",
    tag: {
      slug: strAt(args, "slug"),
      name: strAt(args, "name"),
      color,
      emoji: strAt(args, "emoji"),
      description: strAt(args, "description"),
    },
  };
};

/**
 * Decode a named config-tool call into its op, if the
 * call is one we know and (for the closed dials) carries a
 * valid value. An unknown tool or an out-of-set theme/
 * layout is `none` — the loop simply ignores it.
 */
const opOf = (
  name: SoftStr,
  args: unknown,
): Option<ConfigOp> => {
  switch (name) {
    case "set_tag":
      return some<ConfigOp>(tagOpOf(args));
    case "exclude_path":
      return some<ConfigOp>({
        kind: "ExcludePath",
        glob: strAt(args, "glob"),
      });
    case "include_path":
      return some<ConfigOp>({
        kind: "IncludePath",
        glob: strAt(args, "glob"),
      });
    case "set_sizing_theme":
      return pipe(
        asSizingTheme(strAt(args, "theme")),
        matchOption(
          (): Option<ConfigOp> => none(),
          (theme): Option<ConfigOp> =>
            some<ConfigOp>({
              kind: "SetSizingTheme",
              theme,
            }),
        ),
      );
    case "set_layout":
      return pipe(
        asLayout(strAt(args, "layout")),
        matchOption(
          (): Option<ConfigOp> => none(),
          (layout): Option<ConfigOp> =>
            some<ConfigOp>({
              kind: "SetLayout",
              layout,
            }),
        ),
      );
    default:
      return none();
  }
};

/**
 * Decode one Realtime data-channel event into the ONE
 * domain event it means, if any. Total: unknown event
 * types are `none()`, never a throw.
 */
export const eventOf = (
  raw: unknown,
): Option<AgentEvent> => {
  const type = strAt(raw, "type");
  if (type === "error") {
    return some<AgentEvent>({
      kind: "SessionErrored",
      reason:
        strAt(objAt(raw, "error"), "message") ||
        "the realtime session reported an error",
    });
  }
  if (
    type ===
    "conversation.item.input_audio_transcription.completed"
  ) {
    const text = strAt(raw, "transcript");
    return text === ""
      ? none()
      : some<AgentEvent>({
          kind: "WriterSaid",
          text,
        });
  }
  if (
    type ===
      "response.output_audio_transcript.done" ||
    type === "response.audio_transcript.done"
  ) {
    const text = strAt(raw, "transcript");
    return text === ""
      ? none()
      : some<AgentEvent>({
          kind: "AssistantSaid",
          text,
        });
  }
  if (
    type === "response.function_call_arguments.done"
  ) {
    const callId = strAt(raw, "call_id");
    const args = argsOf(strAt(raw, "arguments"));
    return pipe(
      opOf(strAt(raw, "name"), args),
      matchOption(
        (): Option<AgentEvent> => none(),
        (op: ConfigOp): Option<AgentEvent> =>
          some<AgentEvent>({
            kind: "ConfigCalled",
            callId,
            op,
          }),
      ),
    );
  }
  return none();
};
