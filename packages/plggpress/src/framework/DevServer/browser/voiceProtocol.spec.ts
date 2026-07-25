import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type VoiceLine,
  strAt,
  objAt,
  voiceEventOf,
  foldTranscript,
  jsonOf,
  patchBodyOf,
  toolOutputOf,
} from "plggpress/framework/DevServer/browser/voiceProtocol";

// The browser client's pure half runs perfectly well in Node —
// it is import-free by design — so the whole decoder is
// asserted offline, with no browser, no microphone, and no
// Realtime endpoint.

test("an unknown frame type is Ignored, never a throw", () =>
  check(
    voiceEventOf({ type: "response.created" }),
    toEqual({ kind: "Ignored" }),
  ));

test("a non-object frame is Ignored", () =>
  all([
    check(
      voiceEventOf(null),
      toEqual({ kind: "Ignored" }),
    ),
    check(
      voiceEventOf("nope"),
      toEqual({ kind: "Ignored" }),
    ),
  ]));

test("an error frame carries the upstream message", () =>
  check(
    voiceEventOf({
      type: "error",
      error: { message: "session expired" },
    }),
    toEqual({
      kind: "SessionErrored",
      reason: "session expired",
    }),
  ));

test("an error frame with no message still names itself", () =>
  check(
    voiceEventOf({ type: "error" }),
    toEqual({
      kind: "SessionErrored",
      reason:
        "the realtime session reported an error",
    }),
  ));

test("a completed input transcription is what the writer said", () =>
  check(
    voiceEventOf({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "make this shorter",
    }),
    toEqual({
      kind: "WriterSaid",
      text: "make this shorter",
    }),
  ));

test("an empty writer transcript is Ignored", () =>
  check(
    voiceEventOf({
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "",
    }),
    toEqual({ kind: "Ignored" }),
  ));

test("the GA assistant-transcript event is decoded", () =>
  check(
    voiceEventOf({
      type: "response.output_audio_transcript.done",
      transcript: "Shortened it.",
    }),
    toEqual({
      kind: "AssistantSaid",
      text: "Shortened it.",
    }),
  ));

test("the pre-GA assistant-transcript name is still accepted", () =>
  check(
    voiceEventOf({
      type: "response.audio_transcript.done",
      transcript: "Still here.",
    }),
    toEqual({
      kind: "AssistantSaid",
      text: "Still here.",
    }),
  ));

test("an empty assistant transcript is Ignored", () =>
  check(
    voiceEventOf({
      type: "response.output_audio_transcript.done",
      transcript: "",
    }),
    toEqual({ kind: "Ignored" }),
  ));

test("strAt reads only own string properties", () =>
  all([
    check(strAt({ a: "x" }, "a"), toBe("x")),
    check(strAt({ a: 1 }, "a"), toBe("")),
    check(strAt(null, "a"), toBe("")),
  ]));

test("objAt reaches a nested object, else undefined", () =>
  all([
    check(
      objAt({ error: { m: 1 } }, "error"),
      toEqual({ m: 1 }),
    ),
    check(
      objAt("scalar", "error"),
      toBe(undefined),
    ),
  ]));

const lines: ReadonlyArray<VoiceLine> = [
  { who: "writer", text: "first" },
];

test("the transcript grows for said events only", () =>
  all([
    check(
      foldTranscript(lines, {
        kind: "AssistantSaid",
        text: "second",
      }),
      toEqual([
        { who: "writer", text: "first" },
        { who: "assistant", text: "second" },
      ]),
    ),
    check(
      foldTranscript(lines, {
        kind: "WriterSaid",
        text: "again",
      }),
      toEqual([
        { who: "writer", text: "first" },
        { who: "writer", text: "again" },
      ]),
    ),
    check(
      foldTranscript(lines, {
        kind: "Ignored",
      }),
      toEqual(lines),
    ),
    check(
      foldTranscript(lines, {
        kind: "SessionErrored",
        reason: "boom",
      }),
      toEqual(lines),
    ),
  ]));

test("an edit_doc tool call decodes to an EditRequested", () =>
  check(
    voiceEventOf({
      type: "response.function_call_arguments.done",
      name: "edit_doc",
      call_id: "call_1",
      arguments: JSON.stringify({
        find: "Original body.",
        replace: "Edited body.",
      }),
    }),
    toEqual({
      kind: "EditRequested",
      callId: "call_1",
      find: "Original body.",
      replace: "Edited body.",
    }),
  ));

test("an empty replace is a deletion, not a refusal", () =>
  check(
    voiceEventOf({
      type: "response.function_call_arguments.done",
      name: "edit_doc",
      call_id: "call_2",
      arguments: JSON.stringify({
        find: "drop me",
        replace: "",
      }),
    }),
    toEqual({
      kind: "EditRequested",
      callId: "call_2",
      find: "drop me",
      replace: "",
    }),
  ));

test("an edit with nothing to find never reaches the bridge", () =>
  all([
    check(
      voiceEventOf({
        type: "response.function_call_arguments.done",
        name: "edit_doc",
        call_id: "call_3",
        arguments: JSON.stringify({
          find: "",
          replace: "x",
        }),
      }),
      toEqual({ kind: "Ignored" }),
    ),
    // malformed arguments read as no `find` at all
    check(
      voiceEventOf({
        type: "response.function_call_arguments.done",
        name: "edit_doc",
        call_id: "call_4",
        arguments: "{not json",
      }),
      toEqual({ kind: "Ignored" }),
    ),
  ]));

test("a tool call for another tool is Ignored", () =>
  check(
    voiceEventOf({
      type: "response.function_call_arguments.done",
      name: "search_docs",
      call_id: "call_5",
      arguments: "{}",
    }),
    toEqual({ kind: "Ignored" }),
  ));

test("jsonOf is total over a bad payload", () =>
  all([
    check(jsonOf('{"a":1}'), toEqual({ a: 1 })),
    check(jsonOf("nope"), toBe(null)),
  ]));

test("the patch body is exactly what the existing bridge accepts", () =>
  check(
    patchBodyOf("guide/index.md", "old", "new"),
    toEqual({
      path: "guide/index.md",
      edits: [{ find: "old", replace: "new" }],
    }),
  ));

test("a landed edit is reported back to the model as applied", () =>
  check(
    toolOutputOf(true, {
      path: "guide/index.md",
      applied: true,
    }),
    toBe(
      '{"applied":true,"path":"guide/index.md"}',
    ),
  ));

test("a refusal is reported back verbatim, never swallowed", () =>
  all([
    check(
      toolOutputOf(false, {
        error: "couldn't apply the edit",
      }),
      toBe(
        '{"applied":false,"error":"couldn\'t apply the edit"}',
      ),
    ),
    check(
      toolOutputOf(false, {}),
      toBe(
        '{"applied":false,"error":"the edit was refused"}',
      ),
    ),
  ]));
