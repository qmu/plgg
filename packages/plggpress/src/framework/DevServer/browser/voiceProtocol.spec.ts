import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
} from "plgg-test";
import { none } from "plgg";
import { renderToString } from "plgg-view";
import { type MarkdownDoc } from "plgg-md";
import {
  renderMarkdownWithOptions,
  plainHighlighter,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRenderOptions } from "plggpress/SiteConfig/usecase/renderSeams";
import { href } from "plggpress/Href/usecase/href";
import {
  type VoiceLine,
  type SectionHeading,
  strAt,
  objAt,
  voiceEventOf,
  foldTranscript,
  jsonOf,
  patchBodyOf,
  toolOutputOf,
  sectionHeadingsOf,
  focusTargetOf,
  focusAnswerOf,
  provenanceOf,
  exactlyOnceAt,
} from "plggpress/framework/DevServer/browser/voiceProtocol";
import { locateOnce } from "plggpress/Locate/usecase/locateOnce";

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

test("a focus_section tool call decodes to a FocusRequested", () =>
  check(
    voiceEventOf({
      type: "response.function_call_arguments.done",
      name: "focus_section",
      call_id: "call_6",
      arguments: JSON.stringify({
        heading: "structures and errors",
      }),
    }),
    toEqual({
      kind: "FocusRequested",
      callId: "call_6",
      heading: "structures and errors",
    }),
  ));

test("a move naming no section at all is Ignored", () =>
  all([
    check(
      voiceEventOf({
        type: "response.function_call_arguments.done",
        name: "focus_section",
        call_id: "call_7",
        arguments: JSON.stringify({
          heading: "",
        }),
      }),
      toEqual({ kind: "Ignored" }),
    ),
    check(
      voiceEventOf({
        type: "response.function_call_arguments.done",
        name: "focus_section",
        call_id: "call_8",
        arguments: "{not json",
      }),
      toEqual({ kind: "Ignored" }),
    ),
  ]));

test("a FocusRequested leaves the transcript alone", () =>
  check(
    foldTranscript(lines, {
      kind: "FocusRequested",
      callId: "call_9",
      heading: "usage",
    }),
    toEqual(lines),
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

/* ------------------------------------------------ *
 * focus_section: heading text -> the id it carries   *
 * ------------------------------------------------ */

// A body shaped like the render path's own output: the id on
// the heading, inline markup inside it, and `&` escaped.
const BODY = [
  '<div><h1 id="the-page">The <code>Page</code></h1>',
  "<p>Prose.</p>",
  '<h2 id="structures-errors">Structures &amp; Errors</h2>',
  "<p>Prose.</p>",
  '<h2 id="errors">Errors</h2>',
  '<h3 id="errors-1">Errors</h3>',
  "<h2>Unanchored</h2></div>",
].join("");

const HEADINGS = sectionHeadingsOf(BODY);

test("reads the ids and the visible words the body carries", () =>
  all([
    check(
      HEADINGS.map(
        (h: SectionHeading): string => h.id,
      ),
      toEqual([
        "the-page",
        "structures-errors",
        "errors",
        "errors-1",
      ]),
    ),
    // markup dropped, entity undone — the words a writer says
    check(
      HEADINGS.map(
        (h: SectionHeading): string => h.text,
      ),
      toEqual([
        "The Page",
        "Structures & Errors",
        "Errors",
        "Errors",
      ]),
    ),
  ]));

test("a heading is spoken, not spelled: case, punctuation and & are forgiven", () =>
  all([
    check(
      focusTargetOf(
        HEADINGS,
        "structures and errors",
      ),
      toEqual({
        kind: "FocusMatched",
        id: "structures-errors",
        text: "Structures & Errors",
      }),
    ),
    check(
      focusTargetOf(HEADINGS, "  The page!  "),
      toEqual({
        kind: "FocusMatched",
        id: "the-page",
        text: "The Page",
      }),
    ),
    // a partial only decides when nothing matches exactly
    check(
      focusTargetOf(HEADINGS, "structures"),
      toEqual({
        kind: "FocusMatched",
        id: "structures-errors",
        text: "Structures & Errors",
      }),
    ),
  ]));

test("two sections with the same heading is an ambiguity, never the first", () =>
  check(
    focusTargetOf(HEADINGS, "Errors"),
    toEqual({
      kind: "FocusAmbiguous",
      texts: ["Errors", "Errors"],
    }),
  ));

test("a heading the page does not have is missing, not a guess", () =>
  all([
    check(
      focusTargetOf(HEADINGS, "the error model"),
      toEqual({ kind: "FocusMissing" }),
    ),
    // nothing but punctuation names nothing
    check(
      focusTargetOf(HEADINGS, "…?"),
      toEqual({ kind: "FocusMissing" }),
    ),
    check(
      focusTargetOf([], "anything"),
      toEqual({ kind: "FocusMissing" }),
    ),
  ]));

test("every outcome is a sentence the writer could hear", () =>
  all([
    check(
      focusAnswerOf(
        "usage",
        focusTargetOf(HEADINGS, "the page"),
      ).say,
      toBe("moved to “The Page”"),
    ),
    check(
      focusAnswerOf(
        "errors",
        focusTargetOf(HEADINGS, "errors"),
      ).say,
      toBe(
        "“errors” names 2 sections — say which one",
      ),
    ),
    check(
      focusAnswerOf(
        "the error model",
        focusTargetOf(
          HEADINGS,
          "the error model",
        ),
      ).say,
      toBe(
        "no section called “the error model” on this page",
      ),
    ),
  ]));

test("the model is told which sections matched, so it can ask", () =>
  all([
    check(
      focusAnswerOf(
        "the page",
        focusTargetOf(HEADINGS, "the page"),
      ).output,
      toBe(
        '{"focused":true,"section":"The Page"}',
      ),
    ),
    check(
      focusAnswerOf(
        "errors",
        focusTargetOf(HEADINGS, "errors"),
      ).output,
      toContain(
        '"candidates":["Errors","Errors"]',
      ),
    ),
    check(
      focusAnswerOf(
        "nope",
        focusTargetOf(HEADINGS, "nope"),
      ).output,
      toContain('"focused":false'),
    ),
  ]));

// The ids `focus_section` resolves against MUST be the ids
// the body actually carries — the same `slugs` the dead-link
// checker validates `#fragment`s against (see
// `CheckLinks/usecase/collectPageLinks.ts`). Render a page
// through the press render options and pin the two together,
// so a slugger change can never leave the assistant jumping
// to anchors that do not exist.
const CONFIG: SiteConfig = {
  title: "T",
  description: "D",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
  srcExclude: none(),
  linkIgnore: none(),
  theme: none(),
};

const SOURCE = [
  "# The Page",
  "",
  "## Structures & Errors",
  "",
  "Prose.",
  "",
  "## Errors",
  "",
  "Prose.",
  "",
].join("\n");

const rendered = renderMarkdownWithOptions(
  pressRenderOptions(
    CONFIG,
    plainHighlighter,
    href("/"),
  ),
)(SOURCE);

test("it resolves against exactly the slugs the render path emits", () =>
  check(
    rendered,
    okThen((doc: MarkdownDoc) =>
      all([
        toEqual([...doc.slugs])(
          sectionHeadingsOf(
            renderToString(doc.body),
          ).map(
            (h: SectionHeading): string => h.id,
          ),
        ),
        toEqual({
          kind: "FocusMatched",
          id: "structures-errors",
          text: "Structures & Errors",
        })(
          focusTargetOf(
            sectionHeadingsOf(
              renderToString(doc.body),
            ),
            "structures and errors",
          ),
        ),
      ]),
    ),
  ));

/* --- edit provenance ---------------------------- */

test("an applied edit leaves a record of what changed", () =>
  all([
    check(
      JSON.stringify(
        provenanceOf(
          true,
          "old text",
          "new text",
        ),
      ),
      toBe(
        '[{"was":"old text","now":"new text"}]',
      ),
    ),
    // a refusal leaves nothing to show
    check(
      provenanceOf(false, "old", "new").length,
      toBe(0),
    ),
    // and a deletion has no passage left to annotate
    check(
      provenanceOf(true, "old", "").length,
      toBe(0),
    ),
  ]));

test("the changed passage is addressed exactly once, or not at all", () =>
  all([
    check(exactlyOnceAt("a b c", "b"), toBe(2)),
    // absent
    check(exactlyOnceAt("a b c", "z"), toBe(-1)),
    // ambiguous
    check(exactlyOnceAt("a b b", "b"), toBe(-1)),
    // empty
    check(exactlyOnceAt("a b c", ""), toBe(-1)),
  ]));

// This module is import-free by construction, so its
// exactly-once rule is spelled a second time. Pin the two
// against each other here — where BOTH can be imported —
// so they cannot drift apart silently.
test("the browser's exactly-once rule agrees with the shared locator", () =>
  all(
    [
      ["a b c", "b"],
      ["a b c", "z"],
      ["a b b", "b"],
      ["a b c", ""],
      ["only once here", "once"],
    ].map(
      ([text, find]: ReadonlyArray<string>) => {
        const shared = locateOnce(
          text ?? "",
          find ?? "",
        );
        return check(
          exactlyOnceAt(text ?? "", find ?? ""),
          toBe(
            shared.__tag === "Ok"
              ? shared.content.start
              : -1,
          ),
        );
      },
    ),
  ));
