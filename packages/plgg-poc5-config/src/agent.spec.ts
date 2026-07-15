import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { pipe, matchOption } from "plgg";
import { DEFAULT_CONFIG } from "./config.ts";
import {
  type AgentEvent,
  eventOf,
  instructionsOf,
  summarizeOp,
  SET_TAG_TOOL,
  SET_SIZING_THEME_TOOL,
  CONFIG_TOOLS,
} from "./agent.ts";

const evtKind = (raw: unknown): string =>
  pipe(
    eventOf(raw),
    matchOption(
      (): string => "none",
      (e: AgentEvent): string =>
        e.kind === "ConfigCalled"
          ? `ConfigCalled:${e.op.kind}`
          : e.kind,
    ),
  );

const fnCall = (
  name: string,
  args: unknown,
): unknown => ({
  type: "response.function_call_arguments.done",
  name,
  call_id: "c1",
  arguments: JSON.stringify(args),
});

test("decodes an error event", () =>
  check(
    evtKind({
      type: "error",
      error: { message: "boom" },
    }),
    toBe("SessionErrored"),
  ));

test("decodes writer and assistant transcripts (both GA event names)", () =>
  all([
    check(
      evtKind({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "hi",
      }),
      toBe("WriterSaid"),
    ),
    check(
      evtKind({
        type: "response.output_audio_transcript.done",
        transcript: "yo",
      }),
      toBe("AssistantSaid"),
    ),
    check(
      evtKind({
        type: "response.audio_transcript.done",
        transcript: "yo",
      }),
      toBe("AssistantSaid"),
    ),
    // Empty transcripts are dropped.
    check(
      evtKind({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "",
      }),
      toBe("none"),
    ),
  ]));

test("decodes each config tool call into its op", () =>
  all([
    check(
      evtKind(
        fnCall("set_tag", {
          slug: "concepts",
          name: "Ideas",
          color: "danger",
          emoji: "🧠",
          description: "",
        }),
      ),
      toBe("ConfigCalled:SetTag"),
    ),
    check(
      evtKind(
        fnCall("exclude_path", {
          glob: "x/**",
        }),
      ),
      toBe("ConfigCalled:ExcludePath"),
    ),
    check(
      evtKind(
        fnCall("include_path", {
          glob: "x/**",
        }),
      ),
      toBe("ConfigCalled:IncludePath"),
    ),
    check(
      evtKind(
        fnCall("set_sizing_theme", {
          theme: "sz-airy",
        }),
      ),
      toBe("ConfigCalled:SetSizingTheme"),
    ),
    check(
      evtKind(
        fnCall("set_layout", { layout: "wide" }),
      ),
      toBe("ConfigCalled:SetLayout"),
    ),
  ]));

test("set_tag defaults an unknown color to primary", () =>
  check(
    pipe(
      eventOf(
        fnCall("set_tag", {
          slug: "x",
          name: "X",
          color: "chartreuse",
          emoji: "",
        }),
      ),
      matchOption(
        (): string => "none",
        (e: AgentEvent): string =>
          e.kind === "ConfigCalled" &&
          e.op.kind === "SetTag"
            ? e.op.tag.color
            : "?",
      ),
    ),
    toBe("primary"),
  ));

test("an out-of-set theme/layout or unknown tool or type is dropped", () =>
  all([
    check(
      evtKind(
        fnCall("set_sizing_theme", {
          theme: "gigantic",
        }),
      ),
      toBe("none"),
    ),
    check(
      evtKind(
        fnCall("set_layout", {
          layout: "diagonal",
        }),
      ),
      toBe("none"),
    ),
    check(
      evtKind(fnCall("delete_everything", {})),
      toBe("none"),
    ),
    check(
      evtKind({ type: "response.created" }),
      toBe("none"),
    ),
  ]));

test("summarizeOp names every op kind", () =>
  all([
    check(
      summarizeOp({
        kind: "SetTag",
        tag: {
          slug: "c",
          name: "C",
          color: "primary",
          emoji: "x",
          description: "",
        },
      }).startsWith("set_tag"),
      toBe(true),
    ),
    check(
      summarizeOp({
        kind: "ExcludePath",
        glob: "x",
      }).startsWith("exclude_path"),
      toBe(true),
    ),
    check(
      summarizeOp({
        kind: "IncludePath",
        glob: "x",
      }).startsWith("include_path"),
      toBe(true),
    ),
    check(
      summarizeOp({
        kind: "SetSizingTheme",
        theme: "sz-cozy",
      }).startsWith("set_sizing_theme"),
      toBe(true),
    ),
    check(
      summarizeOp({
        kind: "SetLayout",
        layout: "wide",
      }).startsWith("set_layout"),
      toBe(true),
    ),
  ]));

test("instructions carry the current config and the page tags", () =>
  all([
    check(
      instructionsOf(DEFAULT_CONFIG, [
        "concepts",
        "concepts",
        "packages",
      ]).includes("concepts"),
      toBe(true),
    ),
    check(
      instructionsOf(
        DEFAULT_CONFIG,
        [],
      ).includes("Comfortable"),
      toBe(true),
    ),
    check(
      instructionsOf(
        { ...DEFAULT_CONFIG, tags: [] },
        [],
      ).includes("No tags classified yet"),
      toBe(true),
    ),
    check(
      instructionsOf(
        {
          ...DEFAULT_CONFIG,
          exclusions: ["x/**"],
        },
        [],
      ).includes("Excluded paths"),
      toBe(true),
    ),
  ]));

test("the tool set is the five config tools", () =>
  all([
    check(CONFIG_TOOLS.length, toBe(5)),
    check(SET_TAG_TOOL.name, toBe("set_tag")),
    check(
      SET_SIZING_THEME_TOOL.name,
      toBe("set_sizing_theme"),
    ),
  ]));
