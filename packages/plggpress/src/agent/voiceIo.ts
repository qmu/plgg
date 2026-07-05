import {
  type Option,
  type SoftStr,
  type PromisedResult,
  some,
  none,
  matchResult,
} from "plgg";
import {
  type VoiceCmd,
  type VoiceMsg,
  connected,
  failed,
  answerReady,
  spoke,
} from "plggpress/agent/voiceAgent";

/**
 * The voice-loop IO seam (ticket 25) — the injected boundary
 * between the pure reducer and the browser's WebRTC + OpenAI
 * Realtime + `/search` tool call. The reducer only NAMES effects
 * ({@link VoiceCmd}); this seam performs them. Held as an
 * interface so the interpreter is unit-testable with a fake and
 * the real WebRTC implementation ({@link browserVoiceIo}) stays a
 * coverage-excluded browser seam.
 *
 * - `connect` — mint an ephemeral key + open the Realtime data
 *   channel (Err → the session couldn't start);
 * - `search` — run the RAG tool for a heard query, returning the
 *   answer text the agent will speak;
 * - `speak` — send the answer to the Realtime session for TTS;
 * - `disconnect` — tear the connection down.
 */
export type VoiceIo = Readonly<{
  connect: () => PromisedResult<null, SoftStr>;
  search: (
    query: SoftStr,
  ) => Promise<SoftStr>;
  speak: (text: SoftStr) => Promise<null>;
  disconnect: () => Promise<null>;
}>;

/**
 * Interpret ONE {@link VoiceCmd} against an injected
 * {@link VoiceIo}, returning the {@link VoiceMsg} to feed back
 * into the reducer (or `None` when the effect produces no
 * message, e.g. Disconnect / NoCmd). Pure control-flow — the
 * whole command→message mapping is testable without a browser;
 * a Connect failure becomes a `failed` message, so the loop
 * degrades to the error screen instead of hanging.
 */
export const interpretVoiceCmd =
  (io: VoiceIo) =>
  (
    cmd: VoiceCmd,
  ): Promise<Option<VoiceMsg>> =>
    cmd.__tag === "Connect"
      ? io.connect().then(
          matchResult<
            null,
            SoftStr,
            Option<VoiceMsg>
          >(
            (reason: SoftStr) =>
              some(failed(reason)),
            () => some(connected),
          ),
        )
      : cmd.__tag === "Search"
        ? io
            .search(cmd.content)
            .then((answer: SoftStr) =>
              some(answerReady(answer)),
            )
        : cmd.__tag === "Speak"
          ? io
              .speak(cmd.content)
              .then(() => some(spoke))
          : cmd.__tag === "Disconnect"
            ? io
                .disconnect()
                .then(() => none())
            : Promise.resolve(none());
