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
} from "./agent.ts";
import { buildFtsIndex } from "./poc1.ts";

// The pure heart is tested offline: the Realtime event
// decoder (search AND GRANULAR edit_doc calls), the
// search executor over a real (tiny) index, and the
// edit-capable instruction assembly.

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
        name: "edit_doc",
        call_id: "call_2",
        arguments:
          '{"path":"concepts/result.md","edits":[{"find":"throw","replace":"return err"}]}',
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

test("eventOf extracts the granular edits array, tolerating bad JSON and bad shapes", () => {
  const decoded = eventOf({
    type: "response.function_call_arguments.done",
    name: "edit_doc",
    call_id: "call_2",
    arguments:
      '{"path":"concepts/result.md","edits":[{"find":"never throw","replace":"return a typed error"}]}',
  });
  const bad = eventOf({
    type: "response.function_call_arguments.done",
    name: "edit_doc",
    call_id: "call_2",
    arguments: "not json",
  });
  const edited = pipe(
    decoded,
    matchOption(
      (): string => "?",
      (e: AgentEvent): string =>
        e.kind === "EditCalled"
          ? `${e.path}|${e.edits.length}|${e.edits[0]?.find ?? ""}→${e.edits[0]?.replace ?? ""}`
          : "?",
    ),
  );
  const badEdits = pipe(
    bad,
    matchOption(
      (): number => -1,
      (e: AgentEvent): number =>
        e.kind === "EditCalled"
          ? e.edits.length
          : -1,
    ),
  );
  return all([
    check(
      edited,
      toBe(
        "concepts/result.md|1|never throw→return a typed error",
      ),
    ),
    // Bad JSON still decodes to an EditCalled with an
    // empty edits list — the server rejects it inward.
    check(badEdits, toBe(0)),
  ]);
});

test("eventOf handles the quiet decode branches: fallback error, empty transcripts, non-array edits", () => {
  // An error event with no message falls back to a
  // generic reason (never blank).
  const errNoMsg = pipe(
    eventOf({ type: "error" }),
    matchOption(
      (): string => "?",
      (e: AgentEvent): string =>
        e.kind === "SessionErrored"
          ? e.reason
          : "?",
    ),
  );
  // An empty transcript decodes to nothing, not a blank
  // line.
  const emptyWriter = kindOf({
    type: "conversation.item.input_audio_transcription.completed",
    transcript: "",
  });
  const emptyAssistant = kindOf({
    type: "response.output_audio_transcript.done",
    transcript: "",
  });
  // Valid JSON but a non-array `edits` → an EditCalled
  // with an empty ops list (the server rejects it).
  const badEdits = pipe(
    eventOf({
      type: "response.function_call_arguments.done",
      name: "edit_doc",
      call_id: "c",
      arguments: '{"path":"a.md","edits":"nope"}',
    }),
    matchOption(
      (): number => -1,
      (e: AgentEvent): number =>
        e.kind === "EditCalled"
          ? e.edits.length
          : -1,
    ),
  );
  return all([
    check(errNoMsg.length > 0, toBe(true)),
    check(emptyWriter, toBe("none")),
    check(emptyAssistant, toBe("none")),
    check(badEdits, toBe(0)),
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
    check(withDoc, toContain("edit_doc")),
    // The granular contract: smallest {find, replace}
    // span, exactly-once, watchable in place.
    check(withDoc, toContain("SMALLEST edit")),
    check(
      withDoc,
      toContain("occur exactly once"),
    ),
    // The document's language is the DEFAULT, but an
    // explicit request switches it (PoC 4 live-judging
    // fix, carried forward).
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
  // The editing model quotes exactly what it reads (the
  // `find` must match the file byte-for-byte), so the
  // open-document context must be the real file bytes.
  const raw =
    "# Web development as one typed pipeline\n\nA TypeScript family.\n\n## Option, not null\n\nAbsence is a value.";
  const instructions = instructionsOf(
    some({ file: "index.md", text: raw }),
  );
  return all([
    check(docFiles(INDEX).length, toBe(2)),
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
