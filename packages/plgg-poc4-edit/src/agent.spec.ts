import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import {
  some,
  none,
  matchOption,
  pipe,
} from "plgg";
import {
  type AgentEvent,
  REALTIME_MODEL,
  eventOf,
  runSearchTool,
  instructionsOf,
  docFiles,
  routeOf,
} from "./agent.ts";
import { buildFtsIndex } from "./poc1.ts";

// The pure heart is tested offline: the generalized
// Realtime event decoder (search AND edit calls), the
// search executor over a real (tiny) index, the
// edit-capable instruction assembly, and the doc→route
// mapping the iframe uses.

const INDEX = buildFtsIndex([
  {
    file: "concepts/result.md",
    headingPath: "concepts/result.md > Result",
    text: "handle errors with Result, never throw",
  },
  {
    file: "index.md",
    headingPath: "index.md > plgg",
    text: "a functional programming toolkit",
  },
]);

const kindOf = (raw: unknown): string =>
  pipe(
    eventOf(raw),
    matchOption(
      (): string => "none",
      (e: AgentEvent): string => e.kind,
    ),
  );

test("eventOf decodes the five event shapes and drops the rest", () =>
  all([
    check(
      kindOf({
        type: "error",
        error: { message: "boom" },
      }),
      toBe("SessionErrored"),
    ),
    check(
      kindOf({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "fix the typo",
      }),
      toBe("WriterSaid"),
    ),
    check(
      kindOf({
        type: "response.output_audio_transcript.done",
        transcript: "Done — I changed…",
      }),
      toBe("AssistantSaid"),
    ),
    // The pre-GA name stays accepted (rollback
    // tolerance).
    check(
      kindOf({
        type: "response.audio_transcript.done",
        transcript: "Done — I changed…",
      }),
      toBe("AssistantSaid"),
    ),
    check(
      kindOf({
        type: "response.function_call_arguments.done",
        name: "search_docs",
        call_id: "call_1",
        arguments: '{"keywords":"result errors"}',
      }),
      toBe("SearchCalled"),
    ),
    check(
      kindOf({
        type: "response.function_call_arguments.done",
        name: "edit_file",
        call_id: "call_2",
        arguments:
          '{"path":"concepts/result.md","content":"# Result\\n"}',
      }),
      toBe("EditCalled"),
    ),
    check(
      kindOf({
        type: "response.function_call_arguments.done",
        name: "other_tool",
        call_id: "call_3",
        arguments: "{}",
      }),
      toBe("none"),
    ),
    check(
      kindOf({ type: "session.created" }),
      toBe("none"),
    ),
    check(kindOf("not an object"), toBe("none")),
  ]));

test("eventOf extracts edit-call arguments, tolerating bad JSON", () => {
  const decoded = eventOf({
    type: "response.function_call_arguments.done",
    name: "edit_file",
    call_id: "call_2",
    arguments:
      '{"path":"concepts/result.md","content":"# Result\\n\\nnew text"}',
  });
  const bad = eventOf({
    type: "response.function_call_arguments.done",
    name: "edit_file",
    call_id: "call_2",
    arguments: "not json",
  });
  return all([
    check(
      pipe(
        decoded,
        matchOption(
          (): string => "?",
          (e: AgentEvent): string =>
            e.kind === "EditCalled"
              ? `${e.path}|${e.content}`
              : "?",
        ),
      ),
      toBe(
        "concepts/result.md|# Result\n\nnew text",
      ),
    ),
    check(
      pipe(
        bad,
        matchOption(
          (): string => "?",
          (e: AgentEvent): string =>
            e.kind === "EditCalled"
              ? `${e.path}|${e.content}`
              : "?",
        ),
      ),
      toBe("|"),
    ),
  ]);
});

test("runSearchTool reports hits and nudges on a miss", () => {
  const hit = runSearchTool(
    INDEX,
    "result errors",
  );
  const miss = runSearchTool(
    INDEX,
    "quantum entanglement",
  );
  return all([
    check(hit.trail.hits.length > 0, toBe(true)),
    check(hit.output, toContain("result.md")),
    check(miss.trail.hits.length, toBe(0)),
    check(
      miss.output,
      toContain("different keywords"),
    ),
  ]);
});

test("instructionsOf carries the open document and BOTH tool contracts", () => {
  const withDoc = instructionsOf(
    some({
      file: "concepts/result.md",
      text: "handle errors with Result",
    }),
  );
  const withoutDoc = instructionsOf(none());
  return all([
    check(
      withDoc,
      toContain("concepts/result.md"),
    ),
    check(withDoc, toContain("search_docs")),
    check(withDoc, toContain("edit_file")),
    check(
      withDoc,
      toContain("COMPLETE new markdown"),
    ),
    // The document's language is the DEFAULT, but an
    // explicit request switches it (2026-07-13 live-
    // judging fix) — the instruction must carry both.
    check(
      withDoc,
      toContain(
        "Default to the language the open document is written in",
      ),
    ),
    check(
      withDoc,
      toContain(
        "asks you to speak or reply in another language, switch",
      ),
    ),
    check(
      withoutDoc,
      toContain("No document is open"),
    ),
  ]);
});

test("the open document is carried to the model as its RAW text, not a chunk reconstruction", () => {
  // The editing model overwrites exactly what it reads,
  // so the open-document context must be the real file
  // bytes — feeding heading-path text is what corrupted
  // files before (2026-07-13 fix).
  const raw =
    "# Web development as one typed pipeline\n\nA TypeScript family.\n\n## Option, not null\n\nAbsence is a value.";
  const instructions = instructionsOf(
    some({ file: "index.md", text: raw }),
  );
  return all([
    check(docFiles(INDEX).length, toBe(2)),
    // The raw markdown appears verbatim — no `file >
    // heading` reconstruction in the model's context.
    check(instructions, toContain(raw)),
    check(
      instructions,
      toContain("# Web development"),
    ),
  ]);
});

test("the Realtime snapshot is pinned, not the drifting alias", () =>
  check(
    REALTIME_MODEL,
    toBe("gpt-realtime-2.1"),
  ));

test("routeOf maps corpus files onto the /docs proxy routes", () =>
  all([
    check(routeOf("index.md"), toBe("/docs/")),
    check(
      routeOf("concepts/result.md"),
      toBe("/docs/concepts/result"),
    ),
    check(
      routeOf("packages/index.md"),
      toBe("/docs/packages"),
    ),
  ]));
