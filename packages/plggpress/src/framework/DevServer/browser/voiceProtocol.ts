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
  return IGNORED;
};

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
