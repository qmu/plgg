import { type SoftStr } from "plgg";
import {
  type RealtimeConn,
  type RealtimeBackend,
} from "plggpress/agent/browserVoiceIo";

/**
 * Minimal ambient declarations for the WebRTC + mic globals this
 * seam uses — the plgg tsconfig deliberately omits the DOM lib
 * (lib: ES2021, types: node), so declaring ONLY the surface we
 * touch lets this file type-check in a node build without
 * pulling the whole DOM. At runtime a browser provides the real
 * globals.
 */
declare const navigator: {
  mediaDevices: {
    getUserMedia: (c: {
      audio: boolean;
    }) => Promise<MediaStreamLike>;
  };
};
type MediaStreamLike = Readonly<{
  getTracks: () => ReadonlyArray<unknown>;
}>;
declare const fetch: (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  text: () => Promise<string>;
}>;
declare class RTCPeerConnection {
  createDataChannel(label: string): {
    send: (data: string) => void;
  };
  addTrack(track: unknown): void;
  createOffer(): Promise<{ sdp?: string }>;
  setLocalDescription(d: {
    sdp?: string;
  }): Promise<void>;
  setRemoteDescription(d: {
    type: string;
    sdp: string;
  }): Promise<void>;
  close(): void;
}

/**
 * The BROWSER implementation of {@link RealtimeBackend} — the
 * one genuinely browser-bound seam (ticket 25). Opens an OpenAI
 * Realtime session over WebRTC from a SHORT-LIVED ephemeral key
 * (the standing key stayed on the server, ticket 25 pt.1/2): add
 * the mic track, open the `oai-events` data channel, exchange
 * the SDP offer/answer with the Realtime endpoint, and hand back
 * a {@link RealtimeConn}. Coverage-excluded + wired only by a
 * browser entry point (never the node bundle): it can only run
 * against a live browser + microphone + Realtime endpoint, so it
 * is verified in the browser, not this harness — the interface it
 * satisfies and the interpreter above it ARE tested.
 */
export const realtimeBackend = (
  sdpUrl: SoftStr,
): RealtimeBackend => ({
  open: async (
    ephemeralKey: SoftStr,
  ): Promise<RealtimeConn> => {
    const pc = new RTCPeerConnection();
    const mic =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    const track = mic.getTracks()[0];
    if (track !== undefined) {
      pc.addTrack(track);
    }
    const channel =
      pc.createDataChannel("oai-events");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const res = await fetch(sdpUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp ?? "",
    });
    const answerSdp = await res.text();
    await pc.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    });
    return {
      sendText: (text: SoftStr) =>
        channel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions: text,
            },
          }),
        ),
      close: () => pc.close(),
    };
  },
});
