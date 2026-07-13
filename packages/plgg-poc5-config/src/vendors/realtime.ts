/**
 * The one genuinely browser-bound seam (carried from
 * PoC 3/4/4b): open an OpenAI Realtime session over WebRTC
 * from a SHORT-LIVED ephemeral key, pump every
 * data-channel event to subscribers (the app decodes them
 * with the pure `eventOf`), send tool outputs back, and
 * send a typed writer turn over the SAME data channel.
 * Only bytes move here — no domain logic. Coverage-exempt
 * PoC seam: it can only run against a live browser + mic +
 * Realtime endpoint. In PoC 5 the voice path is a BONUS —
 * the deterministic typed-command path (command.ts) drives
 * every config op without a model; when a key is present,
 * the assistant emits the SAME ops as tool calls.
 * (vendor-neutrality: the vendor lives behind this thin
 * adapter; the domain speaks in our own types.)
 */
import {
  type SoftStr,
  type Option,
  type Result,
  ok,
  err,
  some,
  none,
  isSome,
} from "plgg";

import { REALTIME_MODEL } from "../agent.ts";

/**
 * The GA WebRTC SDP exchange endpoint (probed live on
 * PoC 4, 2026-07-12), pinned to the shared model snapshot.
 */
const SDP_URL = `https://api.openai.com/v1/realtime/calls?model=${REALTIME_MODEL}`;

export type SessionConfig = Readonly<{
  instructions: SoftStr;
  tools: ReadonlyArray<unknown>;
}>;

type Live = Readonly<{
  pc: RTCPeerConnection;
  channel: RTCDataChannel;
  mic: MediaStream;
}>;

// The live connection and its listeners are the runtime's
// mutable seams.
let live: Option<Live> = none();
const listeners = new Set<
  (raw: unknown) => void
>();

/**
 * Subscribe to raw data-channel events; returns the
 * cleanup (the plgg-view custom-Sub contract).
 */
export const subscribeRealtime = (
  listen: (raw: unknown) => void,
): (() => void) => {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
};

const emit = (raw: unknown): void => {
  for (const listen of listeners) {
    listen(raw);
  }
};

/**
 * Open the session: mic in, remote audio out, data
 * channel configured with the instructions + tools on
 * open. Resolves `err` (never throws) so the app folds
 * the failure into its designed error state.
 */
export const openRealtime = async (
  ephemeralKey: SoftStr,
  config: SessionConfig,
): Promise<Result<null, SoftStr>> => {
  try {
    const pc = new RTCPeerConnection();
    const audio = document.createElement("audio");
    audio.autoplay = true;
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream !== undefined) {
        audio.srcObject = stream;
      }
    };
    const mic =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    for (const track of mic.getTracks()) {
      pc.addTrack(track, mic);
    }
    const channel =
      pc.createDataChannel("oai-events");
    channel.onopen = () => {
      // GA session.update shape, probed live over a
      // WebSocket (2026-07-12): `session.type` is
      // REQUIRED and transcription nests under
      // audio.input.transcription.
      channel.send(
        JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: config.instructions,
            tools: config.tools,
            audio: {
              input: {
                transcription: {
                  model: "whisper-1",
                },
              },
            },
          },
        }),
      );
    };
    channel.onmessage = (event) => {
      // Boundary parse: a non-JSON frame is dropped,
      // never a throw into the runtime.
      try {
        emit(JSON.parse(String(event.data)));
      } catch {
        /* ignore non-JSON frames */
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const res = await fetch(SDP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp ?? "",
    });
    if (!res.ok) {
      for (const track of mic.getTracks()) {
        track.stop();
      }
      pc.close();
      return err(
        `realtime SDP exchange failed (${res.status})`,
      );
    }
    await pc.setRemoteDescription({
      type: "answer",
      sdp: await res.text(),
    });
    live = some({ pc, channel, mic });
    return ok(null);
  } catch (cause) {
    return err(
      cause instanceof Error
        ? cause.message
        : String(cause),
    );
  }
};

/**
 * Hand a tool result back to the model and ask it to
 * continue the response.
 */
export const sendToolOutput = (
  callId: SoftStr,
  output: SoftStr,
): void => {
  if (isSome(live)) {
    live.content.channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output,
        },
      }),
    );
    live.content.channel.send(
      JSON.stringify({
        type: "response.create",
      }),
    );
  }
};

/**
 * The typed-text path over the live session: a writer turn
 * as an `input_text` conversation item + a
 * `response.create`, over the SAME live data channel — no
 * second mint, no second session. (Used only when the
 * writer routes a free-text turn to the assistant; the
 * deterministic config commands never need it.)
 */
export const sendTextTurn = (
  text: SoftStr,
): void => {
  if (isSome(live)) {
    live.content.channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      }),
    );
    live.content.channel.send(
      JSON.stringify({
        type: "response.create",
      }),
    );
  }
};

/** Stop the mic and close the connection. */
export const closeRealtime = (): void => {
  if (isSome(live)) {
    for (const track of live.content.mic.getTracks()) {
      track.stop();
    }
    live.content.pc.close();
    live = none();
  }
};
