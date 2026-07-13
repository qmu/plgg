import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { pipe, matchOption } from "plgg";
import { buildPages } from "./classify.ts";
import {
  type AgentEvent,
  eventOf,
  instructionsOf,
  summarizeQuery,
  QUERY_TOOLS,
  QUERY_FACETS_TOOL,
  QUERY_LINKS_TOOL,
} from "./agent.ts";

const evtKind = (raw: unknown): string =>
  pipe(
    eventOf(raw),
    matchOption(
      (): string => "none",
      (e: AgentEvent): string =>
        e.kind === "QueryCalled"
          ? `QueryCalled:${e.query.kind}`
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

test("decodes error and transcript events", () =>
  all([
    check(
      evtKind({
        type: "error",
        error: { message: "boom" },
      }),
      toBe("SessionErrored"),
    ),
    check(
      evtKind({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "hi",
      }),
      toBe("WriterSaid"),
    ),
    check(
      evtKind({
        type: "response.audio_transcript.done",
        transcript: "yo",
      }),
      toBe("AssistantSaid"),
    ),
  ]));

test("decodes each query tool call into its variant query", () =>
  all([
    check(
      evtKind(
        fnCall("query_facets", {
          mode: "and",
          tags: ["a", "b"],
        }),
      ),
      toBe("QueryCalled:tag-facets"),
    ),
    check(
      evtKind(
        fnCall("query_links", {
          focus: "x.md",
        }),
      ),
      toBe("QueryCalled:link-graph"),
    ),
    check(
      evtKind(
        fnCall("query_filter", {
          text: "o",
          tags: ["c"],
        }),
      ),
      toBe("QueryCalled:multi-filter"),
    ),
  ]));

test("query_facets defaults an unknown mode to and", () =>
  check(
    pipe(
      eventOf(
        fnCall("query_facets", {
          mode: "nand",
          tags: ["a"],
        }),
      ),
      matchOption(
        (): string => "none",
        (e: AgentEvent): string =>
          e.kind === "QueryCalled" &&
          e.query.kind === "tag-facets"
            ? e.query.query.mode
            : "?",
      ),
    ),
    toBe("and"),
  ));

test("an unknown tool or event type is dropped", () =>
  all([
    check(
      evtKind(fnCall("query_universe", {})),
      toBe("none"),
    ),
    check(
      evtKind({ type: "response.created" }),
      toBe("none"),
    ),
  ]));

test("an error with no message falls back to a default reason", () =>
  check(
    evtKind({ type: "error" }),
    toBe("SessionErrored"),
  ));

test("empty transcripts are dropped", () =>
  all([
    check(
      evtKind({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "",
      }),
      toBe("none"),
    ),
    check(
      evtKind({
        type: "response.audio_transcript.done",
        transcript: "",
      }),
      toBe("none"),
    ),
  ]));

test("query_facets with no tags array yields empty tags", () =>
  check(
    pipe(
      eventOf(
        fnCall("query_facets", { mode: "or" }),
      ),
      matchOption(
        (): number => -1,
        (e: AgentEvent): number =>
          e.kind === "QueryCalled" &&
          e.query.kind === "tag-facets"
            ? e.query.query.tags.length
            : -2,
      ),
    ),
    toBe(0),
  ));

test("summarizeQuery names every variant", () =>
  all([
    check(
      summarizeQuery({
        kind: "tag-facets",
        query: { tags: ["a"], mode: "or" },
      }).startsWith("facets"),
      toBe(true),
    ),
    check(
      summarizeQuery({
        kind: "link-graph",
        query: { focus: "x.md" },
      }).startsWith("links"),
      toBe(true),
    ),
    check(
      summarizeQuery({
        kind: "multi-filter",
        query: { text: "o", tags: ["c"] },
      }).startsWith("filter"),
      toBe(true),
    ),
  ]));

test("instructions carry the corpus tags", () =>
  check(
    instructionsOf(
      buildPages([
        {
          path: "concepts/option.md",
          text: "x",
        },
      ]),
    ).includes("concepts"),
    toBe(true),
  ));

test("the tool set is the three query tools", () =>
  all([
    check(QUERY_TOOLS.length, toBe(3)),
    check(
      QUERY_FACETS_TOOL.name,
      toBe("query_facets"),
    ),
    check(
      QUERY_LINKS_TOOL.name,
      toBe("query_links"),
    ),
  ]));
