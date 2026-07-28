// The PURE half of the dev voice client — the decoder that
// turns one raw OpenAI Realtime data-channel frame into the
// one thing the page can do about it.
//
// This module is deliberately IMPORT-FREE. It is shipped to
// the browser as an ES module by the dev server's module
// route (type-stripped, never bundled), and a browser has no
// resolver for a bare `plgg` specifier — so it cannot reach
// the family's `Option`/`Result` vocabulary the way a
// server-side module does. The absence case is therefore
// modelled INSIDE the closed union (`Ignored`) rather than as
// an `Option`: same discipline, no `undefined`, no `null`, and
// the decoder stays total. Everything that CAN live on the
// server (the session instructions, the tool schema, the doc
// lookup) does live there, precisely so this file stays this
// small.

/** What one Realtime frame can mean to the dev voice panel. */
export type VoiceEvent =
  | Readonly<{
      kind: "WriterSaid";
      text: string;
    }>
  | Readonly<{
      kind: "AssistantSaid";
      text: string;
    }>
  | Readonly<{
      kind: "SessionErrored";
      reason: string;
    }>
  /**
   * The model asked to edit the open document. It names WHAT
   * to change, never WHERE — the file is fixed by the server
   * for the whole session.
   */
  | Readonly<{
      kind: "EditRequested";
      callId: string;
      find: string;
      replace: string;
    }>
  /**
   * The model asked to move the page to one section of the
   * open document. It names the heading in the WRITER's
   * words — not an id, not a selector, not an index — and
   * nothing about this reaches the disk.
   */
  | Readonly<{
      kind: "FocusRequested";
      callId: string;
      heading: string;
    }>
  /** A frame this page has nothing to do about. */
  | Readonly<{ kind: "Ignored" }>;

/** One line of the visible conversation. */
export type VoiceLine = Readonly<{
  who: "writer" | "assistant";
  text: string;
}>;

const IGNORED: VoiceEvent = { kind: "Ignored" };

/** An own string property, or `""` — never a throw, never `undefined`. */
export const strAt = (
  value: unknown,
  key: string,
): string => {
  const got: unknown =
    typeof value === "object" && value !== null
      ? Reflect.get(value, key)
      : undefined;
  return typeof got === "string" ? got : "";
};

/** A nested object property, as `unknown` (the boundary rule). */
export const objAt = (
  value: unknown,
  key: string,
): unknown =>
  typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;

/**
 * Decode one data-channel frame. Total: an unknown or
 * uninteresting `type` is `Ignored`, so the Realtime protocol
 * can grow without breaking the panel.
 *
 * The transcript event names follow the GA rename measured
 * live on 2026-07-12 (`response.output_audio_transcript.done`);
 * the pre-GA name stays accepted so an upstream rollback
 * cannot silence the page.
 */
export const voiceEventOf = (
  raw: unknown,
): VoiceEvent => {
  const type = strAt(raw, "type");
  if (type === "error") {
    return {
      kind: "SessionErrored",
      reason:
        strAt(objAt(raw, "error"), "message") ||
        "the realtime session reported an error",
    };
  }
  if (
    type ===
    "conversation.item.input_audio_transcription.completed"
  ) {
    const text = strAt(raw, "transcript");
    return text === ""
      ? IGNORED
      : { kind: "WriterSaid", text };
  }
  if (
    type ===
      "response.output_audio_transcript.done" ||
    type === "response.audio_transcript.done"
  ) {
    const text = strAt(raw, "transcript");
    return text === ""
      ? IGNORED
      : { kind: "AssistantSaid", text };
  }
  if (
    type ===
    "response.function_call_arguments.done"
  ) {
    return toolCallOf(
      strAt(raw, "name"),
      strAt(raw, "call_id"),
      jsonOf(strAt(raw, "arguments")),
    );
  }
  return IGNORED;
};

/**
 * One completed tool call, by name. A tool this page does
 * not implement is `Ignored` rather than an error: the
 * session's tool list is decided on the server, and a page
 * that met an unknown one has nothing to do about it.
 */
const toolCallOf = (
  name: string,
  callId: string,
  args: unknown,
): VoiceEvent =>
  name === "edit_doc"
    ? editRequestOf(callId, args)
    : name === "focus_section"
      ? focusRequestOf(callId, args)
      : IGNORED;

const editRequestOf = (
  callId: string,
  args: unknown,
): VoiceEvent => {
  const find = strAt(args, "find");
  // An edit with nothing to locate cannot be applied and
  // must not reach the bridge as a no-op patch.
  return find === ""
    ? IGNORED
    : {
        kind: "EditRequested",
        callId,
        find,
        replace: strAt(args, "replace"),
      };
};

const focusRequestOf = (
  callId: string,
  args: unknown,
): VoiceEvent => {
  const heading = strAt(args, "heading");
  // A move with nothing to name cannot resolve to a section,
  // and must not read as "no section by that heading".
  return heading === ""
    ? IGNORED
    : { kind: "FocusRequested", callId, heading };
};

/** Parse a JSON string, or `null` — the `arguments` boundary. */
export const jsonOf = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * The body the live-edit bridge accepts, for one requested
 * edit against the session's own document. Shaped to
 * plggpress's EXISTING `POST /__plggpress_patch` contract
 * (`{path, edits: [{find, replace}]}`) — the assistant is
 * another DRIVER of that bridge, not a second write path.
 */
export const patchBodyOf = (
  doc: string,
  find: string,
  replace: string,
): unknown => ({
  path: doc,
  edits: [{ find, replace }],
});

/**
 * What the model is told about its own edit. The bridge
 * answers every outcome as JSON with a named reason, so a
 * refusal is reported back verbatim and the model can retry
 * with a more exact span instead of assuming it succeeded.
 */
export const toolOutputOf = (
  ok: boolean,
  body: unknown,
): string =>
  JSON.stringify(
    ok
      ? {
          applied: true,
          path: strAt(body, "path"),
        }
      : {
          applied: false,
          error:
            strAt(body, "error") ||
            "the edit was refused",
        },
  );

/* ------------------------------------------------ *
 * Moving the page: heading text -> the id it carries  *
 * ------------------------------------------------ */

/**
 * One heading the OPEN PAGE actually carries: the id the
 * render path stamped on it, and the words the writer reads.
 * Both are recovered from the rendered body itself
 * ({@link sectionHeadingsOf}), so a spoken lookup can only
 * ever resolve to an anchor the page really has — the same
 * ids `collectPageLinks` collects and the dead-link checker
 * validates `#fragment`s against.
 */
export type SectionHeading = Readonly<{
  id: string;
  text: string;
}>;

/**
 * Where a spoken heading points. Absence and ambiguity are
 * VARIANTS — not `null`, not an empty-string id — so the
 * caller cannot forget them, and each comes back to the
 * assistant as something it can say to the writer.
 */
export type FocusTarget =
  | Readonly<{
      kind: "FocusMatched";
      id: string;
      text: string;
    }>
  /** The words name more than one section; pick none. */
  | Readonly<{
      kind: "FocusAmbiguous";
      texts: ReadonlyArray<string>;
    }>
  /** No section on this page answers to those words. */
  | Readonly<{ kind: "FocusMissing" }>;

const MISSING: FocusTarget = {
  kind: "FocusMissing",
};

/**
 * The rendered heading elements, with the level captured so
 * the closing tag is matched by BACKREFERENCE — an `<h2>`
 * can only be closed by `</h2>`. Only a heading carrying an
 * `id` is a section a page can be moved to.
 */
const HEADING_RE =
  /<h([1-6])\b[^>]*\sid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi;

// Capture positions in HEADING_RE. Read through `strAt`, so
// a group that ever fails to match reads as "" rather than
// leaking `undefined` into a heading.
const ID_GROUP = "2";
const TEXT_GROUP = "3";

const TAG_RE = /<[^>]*>/g;
const SPACE_RE = /\s+/g;

/**
 * The entity set both the render path's escaper and a
 * browser's `innerHTML` serializer emit. `&amp;` is undone
 * LAST, so a literal `&amp;lt;` in the source survives as
 * `&lt;` rather than decoding twice.
 */
const decodedText = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** A heading's visible words: its markup dropped, entities undone. */
const plainTextOf = (inner: string): string =>
  decodedText(inner.replace(TAG_RE, ""))
    .replace(SPACE_RE, " ")
    .trim();

/**
 * Every section the given rendered HTML offers, in document
 * order. Deliberately reads the BODY rather than recomputing
 * a slug: the id a jump needs is the one the page emitted,
 * and re-implementing the slugger in a browser module is
 * exactly how the two would drift apart.
 */
export const sectionHeadingsOf = (
  html: string,
): ReadonlyArray<SectionHeading> =>
  [...html.matchAll(HEADING_RE)].map(
    (m: RegExpMatchArray): SectionHeading => ({
      id: strAt(m, ID_GROUP),
      text: plainTextOf(strAt(m, TEXT_GROUP)),
    }),
  );

/**
 * What a spoken heading and a rendered one are compared as:
 * lowercase, `&` spoken out as "and" (a writer says
 * "structures and errors" for `Structures & Errors`), every
 * other punctuation mark and run of whitespace flattened to
 * a single space. Letters and digits of any script survive,
 * so a Japanese heading is matched by its own words.
 */
const spokenKey = (text: string): string =>
  text
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

// An exact heading match wins outright; only when nothing
// matches exactly does a partial ("errors" for "Structures &
// Errors") get a say — so a heading whose words are a prefix
// of another's is still reachable by naming it in full.
const preferExact = (
  exact: ReadonlyArray<SectionHeading>,
  loose: ReadonlyArray<SectionHeading>,
): ReadonlyArray<SectionHeading> =>
  exact.length > 0 ? exact : loose;

const candidatesOf = (
  headings: ReadonlyArray<SectionHeading>,
  key: string,
): ReadonlyArray<SectionHeading> =>
  preferExact(
    headings.filter(
      (h: SectionHeading): boolean =>
        spokenKey(h.text) === key,
    ),
    headings.filter(
      (h: SectionHeading): boolean =>
        spokenKey(h.text).includes(key),
    ),
  );

// One candidate is the answer; several are an ambiguity to
// hand back, never a silent "first wins". Folded rather than
// indexed, so there is no unreachable bounds check.
const decided = (
  found: ReadonlyArray<SectionHeading>,
): FocusTarget =>
  found.length > 1
    ? {
        kind: "FocusAmbiguous",
        texts: found.map(
          (h: SectionHeading): string => h.text,
        ),
      }
    : found.reduce(
        (
          _: FocusTarget,
          h: SectionHeading,
        ): FocusTarget => ({
          kind: "FocusMatched",
          id: h.id,
          text: h.text,
        }),
        MISSING,
      );

/**
 * Resolve the words a writer spoke against the sections the
 * page carries. Pure and total: no throw, no sentinel, and
 * no preference for the first of several matches.
 */
export const focusTargetOf = (
  headings: ReadonlyArray<SectionHeading>,
  spoken: string,
): FocusTarget =>
  resolvedKey(headings, spokenKey(spoken));

const resolvedKey = (
  headings: ReadonlyArray<SectionHeading>,
  key: string,
): FocusTarget =>
  key === ""
    ? MISSING
    : decided(candidatesOf(headings, key));

/**
 * What is said about one attempted move: the typed answer
 * folded back to the model over the tool-call channel, and
 * the one sentence the panel shows the writer. Both in the
 * writer's vocabulary — a heading that did not resolve is a
 * question to ask, not a technical condition to report.
 */
export type FocusAnswer = Readonly<{
  output: string;
  say: string;
}>;

export const focusAnswerOf = (
  spoken: string,
  target: FocusTarget,
): FocusAnswer =>
  target.kind === "FocusMatched"
    ? {
        output: JSON.stringify({
          focused: true,
          section: target.text,
        }),
        say: `moved to “${target.text}”`,
      }
    : target.kind === "FocusAmbiguous"
      ? {
          output: JSON.stringify({
            focused: false,
            reason:
              "more than one section has that heading — ask the writer which one",
            candidates: target.texts,
          }),
          say: `“${spoken}” names ${target.texts.length} sections — say which one`,
        }
      : missingAnswer(spoken, target);

/**
 * The last arm of the match above. Its parameter names the
 * ONE variant that can still remain, so adding a
 * {@link FocusTarget} variant stops this call compiling —
 * exhaustiveness with no `switch`, no `default`, and no
 * throw to make a total function partial again.
 */
const missingAnswer = (
  spoken: string,
  _remaining: Readonly<{
    kind: "FocusMissing";
  }>,
): FocusAnswer => ({
  output: JSON.stringify({
    focused: false,
    reason:
      "no section of the open document has that heading — ask the writer to name one from the page",
  }),
  say: `no section called “${spoken}” on this page`,
});

/**
 * Fold one decoded event into the visible transcript. A
 * `SessionErrored` or `Ignored` frame leaves it untouched —
 * the status line, not the transcript, is where a failure
 * belongs.
 */
export const foldTranscript = (
  lines: ReadonlyArray<VoiceLine>,
  event: VoiceEvent,
): ReadonlyArray<VoiceLine> =>
  event.kind === "WriterSaid"
    ? [
        ...lines,
        { who: "writer", text: event.text },
      ]
    : event.kind === "AssistantSaid"
      ? [
          ...lines,
          {
            who: "assistant",
            text: event.text,
          },
        ]
      : lines;

/* ------------------------------------------------ *
 * Edit provenance                                    *
 * ------------------------------------------------ */

/**
 * WHAT THE ASSISTANT CHANGED, as the writer needs to see
 * it: the passage as it WAS, and as it now reads. Both are
 * the exact strings the bridge applied — the `find` and the
 * `replace` of an edit it answered `applied` to — so this
 * is a record of the write, never a reconstruction of it.
 */
export type Provenance = Readonly<{
  was: string;
  now: string;
}>;

/**
 * The provenance one edit leaves behind. Nothing is
 * recorded for an edit the bridge refused, and nothing for
 * a replacement that is empty — a deletion has no passage
 * left to annotate in place.
 */
export const provenanceOf = (
  applied: boolean,
  find: string,
  replace: string,
): ReadonlyArray<Provenance> =>
  applied && replace !== ""
    ? [{ was: find, now: replace }]
    : [];

/**
 * WHERE the changed passage is, or -1 when it cannot be
 * addressed: the exactly-once rule, applied to the page's
 * own text.
 *
 * This is `Locate/usecase/locateOnce`'s contract, spelled a
 * second time because this module is import-free by
 * construction (see the header: a browser has no resolver
 * for a bare `plgg` specifier, and the shared locator
 * imports one). `voiceProtocol.spec.ts` pins the two
 * against each other so they cannot drift apart silently.
 */
export const exactlyOnceAt = (
  text: string,
  find: string,
): number =>
  find === "" || text.split(find).length - 1 !== 1
    ? -1
    : text.indexOf(find);
