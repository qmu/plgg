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
  isSome,
  isNone,
  matchOption,
  pipe,
} from "plgg";
import {
  type AgentEvent,
  eventOf,
  runSearchTool,
  instructionsOf,
  docFiles,
  docTextOf,
  hasCjk,
} from "./agent.ts";
import { buildFtsIndex } from "./poc1.ts";

// The pure heart is tested offline: the Realtime event
// decoder, the tool executor over real (tiny) indexes,
// and the instruction assembly — no browser, no mic, no
// network (the voiceAgent testing contract).

const EN = buildFtsIndex([
  {
    file: "concepts/result.md",
    headingPath: "concepts/result.md > Result",
    text: "handle errors with Result, never throw",
  },
]);

const JA = buildFtsIndex(
  [
    {
      file: "implementation/objective-documentation.md",
      headingPath:
        "implementation/objective-documentation.md > 客観的な文書化",
      text: "当社の文書は、それ単体で意味が通じるように書く。文書化の基準を定める。",
    },
  ],
  "segmenter",
);

const kindOf = (raw: unknown): string =>
  pipe(
    eventOf(raw),
    matchOption(
      (): string => "none",
      (e: AgentEvent): string => e.kind,
    ),
  );

test("eventOf decodes the four event shapes and drops the rest", () =>
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
        transcript: "文書化の基準は?",
      }),
      toBe("WriterSaid"),
    ),
    check(
      kindOf({
        type: "response.audio_transcript.done",
        transcript: "The docs say…",
      }),
      toBe("AssistantSaid"),
    ),
    check(
      kindOf({
        type: "response.function_call_arguments.done",
        name: "search_docs",
        call_id: "call_1",
        arguments: '{"keywords":"文書化 基準"}',
      }),
      toBe("ToolCalled"),
    ),
    check(
      kindOf({
        type: "response.function_call_arguments.done",
        name: "other_tool",
        call_id: "call_2",
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

test("eventOf extracts tool-call keywords, tolerating bad JSON", () =>
  all([
    check(
      pipe(
        eventOf({
          type: "response.function_call_arguments.done",
          name: "search_docs",
          call_id: "call_1",
          arguments: '{"keywords":"文書化 基準"}',
        }),
        matchOption(
          (): string => "",
          (e: AgentEvent): string =>
            e.kind === "ToolCalled"
              ? e.keywords
              : "",
        ),
      ),
      toBe("文書化 基準"),
    ),
    check(
      pipe(
        eventOf({
          type: "response.function_call_arguments.done",
          name: "search_docs",
          call_id: "call_1",
          arguments: "not json",
        }),
        matchOption(
          (): string => "?",
          (e: AgentEvent): string =>
            e.kind === "ToolCalled"
              ? e.keywords
              : "?",
        ),
      ),
      toBe(""),
    ),
  ]));

test("runSearchTool routes by keyword script and reports hits", () => {
  const ja = runSearchTool(
    EN,
    some(JA),
    "文書化 基準",
  );
  const en = runSearchTool(
    EN,
    some(JA),
    "result errors",
  );
  return all([
    check(ja.trail.corpus, toBe("qmu-ja")),
    check(ja.trail.hits.length > 0, toBe(true)),
    check(ja.output, toContain("客観的な文書化")),
    check(en.trail.corpus, toBe("guide")),
    check(en.trail.hits.length > 0, toBe(true)),
  ]);
});

test("runSearchTool tells the model to vary keywords on a miss", () => {
  const miss = runSearchTool(
    EN,
    none(),
    "ドキュメンテーション",
  );
  return all([
    // No JA index shipped → falls back to the guide.
    check(miss.trail.corpus, toBe("guide")),
    check(miss.trail.hits.length, toBe(0)),
    check(
      miss.output,
      toContain("different keywords"),
    ),
  ]);
});

test("instructionsOf carries the open document and the driving rules", () => {
  const withDoc = instructionsOf(
    some({
      file: "implementation/objective-documentation.md",
      text: "当社の文書は、それ単体で意味が通じるように書く。",
    }),
  );
  const withoutDoc = instructionsOf(none());
  return all([
    check(
      withDoc,
      toContain(
        "implementation/objective-documentation.md",
      ),
    ),
    check(
      withDoc,
      toContain("それ単体で意味が通じる"),
    ),
    check(withDoc, toContain("search_docs")),
    check(
      withDoc,
      toContain("keyword variations"),
    ),
    check(
      withoutDoc,
      toContain("No document is open"),
    ),
  ]);
});

test("documents reassemble from their chunks", () =>
  all([
    check(docFiles(JA).length, toBe(1)),
    check(
      docFiles(JA)[0] ?? "",
      toBe(
        "implementation/objective-documentation.md",
      ),
    ),
    check(
      docTextOf(
        JA,
        "implementation/objective-documentation.md",
      ),
      toContain("客観的な文書化"),
    ),
  ]));

test("hasCjk routes by script", () =>
  all([
    check(hasCjk("文書化 基準"), toBe(true)),
    check(hasCjk("result errors"), toBe(false)),
  ]));

test("Option helpers behave as the tool routing expects", () =>
  all([
    check(isSome(some(1)), toBe(true)),
    check(isNone(none()), toBe(true)),
  ]));
