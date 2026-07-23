import {
  type SoftStr,
  type Option,
  type PromisedResult,
  ok,
  err,
  some,
  none,
  isNone,
  matchOption,
} from "plgg";
import { type VoiceIo } from "plgg-cms/agent/voiceIo";

/**
 * The live Realtime connection, as the MINIMAL surface the
 * adapter uses — declared here (not from the DOM lib, which the
 * plgg tsconfig omits) so this file TYPE-CHECKS in a node build.
 * The concrete implementation (an `RTCPeerConnection` + data
 * channel + mic `MediaStream`) is supplied by the browser entry
 * point that has the DOM globals; that ~20-line wiring is the
 * only genuinely browser-bound code and lives in a browser build.
 */
export type RealtimeConn = Readonly<{
  sendText: (text: SoftStr) => void;
  close: () => void;
}>;

/**
 * The browser backend the adapter is injected with: open a
 * Realtime connection from an ephemeral key. Its implementation
 * is the DOM/WebRTC seam a browser build provides; the adapter
 * below is DOM-free and coverage-excluded (it needs a live
 * backend + network to run).
 */
export type RealtimeBackend = Readonly<{
  open: (
    ephemeralKey: SoftStr,
  ) => Promise<RealtimeConn>;
}>;

/** The minimal HTTP surface (a browser `fetch` adapter). */
export type HttpJson = (
  url: SoftStr,
  body: SoftStr,
) => Promise<{
  okStatus: boolean;
  text: () => Promise<SoftStr>;
}>;

/**
 * The concrete {@link VoiceIo} over a browser {@link
 * RealtimeBackend} + `fetch` (ticket 25). `connect` mints an
 * ephemeral key from `POST /api/agent/session` and opens the
 * Realtime data channel; `search` POSTs the heard query to
 * ticket 24's `/api/search` and formats the hits into an answer;
 * `speak` pushes the answer to the data channel for TTS;
 * `disconnect` closes it. The standing key never touches the
 * client (only the ephemeral one does). DOM-free (the WebRTC
 * globals are behind the injected backend), so it type-checks;
 * coverage-excluded because it needs a live browser + network,
 * exactly like fetchEmbedder / realtimeKeyMinter / stdioServer.
 */
export const browserVoiceIo = (
  backend: RealtimeBackend,
  http: HttpJson,
  mintUrl: SoftStr,
  searchUrl: SoftStr,
): VoiceIo => {
  let conn: Option<RealtimeConn> = none();
  return {
    connect: (): PromisedResult<
      null,
      SoftStr
    > =>
      http(mintUrl, "")
        .then(async (res) => {
          if (!res.okStatus) {
            return err("could not mint a key");
          }
          const key = await res.text();
          conn = some(await backend.open(key));
          return ok(null);
        })
        .catch(() =>
          err("voice connection failed"),
        ),
    search: (query: SoftStr) =>
      http(
        searchUrl,
        JSON.stringify({ query }),
      )
        .then((res) => res.text())
        .then(
          (hits) =>
            `Based on the docs: ${hits}`,
        )
        .catch(
          () => "I could not search the docs.",
        ),
    speak: (text: SoftStr) => {
      matchOption<RealtimeConn, void>(
        () => undefined,
        (c) => c.sendText(text),
      )(conn);
      return Promise.resolve(null);
    },
    disconnect: () => {
      if (!isNone(conn)) {
        conn.content.close();
        conn = none();
      }
      return Promise.resolve(null);
    },
  };
};
